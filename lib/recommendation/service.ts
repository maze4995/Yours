import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileInput, RecommendationResult, SoftwareCatalogItem } from "@/lib/types";
import { createProfileFingerprint, decideFitDecision, scoreCatalogCandidates } from "@/lib/recommendation/scoring";
import {
  generateFitAnalysis,
  generateRecommendationItems,
  buildDeterministicAnalysis,
  fallbackNarrative
} from "@/lib/recommendation/openai";

export async function runRecommendationFlow(params: {
  supabase: SupabaseClient;
  userId: string;
  profile: ProfileInput;
  /** When true, skip all OpenAI calls and save a deterministic result immediately.
   *  The results page will then auto-trigger AI enhancement via /api/recommendations/[id]/enhance. */
  skipAI?: boolean;
}): Promise<RecommendationResult> {
  const { supabase, userId, profile, skipAI = false } = params;
  const profileFingerprint = createProfileFingerprint(profile);

  const { data: cached } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_fingerprint", profileFingerprint)
    .maybeSingle();

  if (cached) {
    // Keep cached recommendation as the latest analysis touch for dashboard history.
    await supabase.from("recommendations").update({ updated_at: new Date().toISOString() }).eq("id", cached.id);

    return {
      recommendationId: cached.id,
      items: cached.items,
      fitDecision: cached.fit_decision,
      fitReason: cached.fit_reason ?? ""
    } satisfies RecommendationResult;
  }

  const { data: catalogRows, error: catalogError } = await supabase
    .from("software_catalog")
    .select("*")
    .eq("is_active", true);

  if (catalogError) {
    throw new Error(`CATALOG_ERROR:${catalogError.message}`);
  }

  const catalog = (catalogRows ?? []) as unknown as SoftwareCatalogItem[];
  const scored = scoreCatalogCandidates(profile, catalog);
  const candidateIds = scored.slice(0, 8).map((candidate) => candidate.item.id);

  // --- Fast path: save deterministic result immediately, AI enhancement happens later ---
  if (skipAI) {
    const items = scored.slice(0, 3).map((c) => fallbackNarrative(c, profile));
    const fit = decideFitDecision(items);
    const deterministicAnalysis = buildDeterministicAnalysis(profile, fit.fitDecision, items);
    // _aiEnhanced:false is the signal for the results page to trigger background AI enhancement
    const fitReason = JSON.stringify({ ...deterministicAnalysis, _aiEnhanced: false });

    const { data: created, error: createError } = await supabase
      .from("recommendations")
      .insert({
        user_id: userId,
        profile_fingerprint: profileFingerprint,
        profile_snapshot: profile,
        candidate_ids: candidateIds,
        items,
        fit_decision: fit.fitDecision,
        fit_reason: fitReason
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`RECOMMENDATION_INSERT_ERROR:${createError.message}`);
    }

    return {
      recommendationId: created.id,
      items,
      fitDecision: fit.fitDecision,
      fitReason: fitReason
    };
  }

  // --- Full AI path ---
  const items = await generateRecommendationItems(profile, scored);
  const fit = decideFitDecision(items);

  // OpenAI로 개인화된 분석 리포트 생성 (실패 시 기본값 유지)
  const aiAnalysis = await generateFitAnalysis(
    profile,
    fit.fitDecision,
    items,
    scored.slice(0, 3)
  );
  if (aiAnalysis) {
    fit.fitReason = aiAnalysis;

    try {
      const parsed = JSON.parse(aiAnalysis) as {
        custom_build_framework?: {
          final_decision?: {
            custom_build?: boolean;
          };
        };
        solution_direction?: {
          can_existing_software_solve?: boolean;
        };
      };

      const customBuildDecision = parsed?.custom_build_framework?.final_decision?.custom_build;
      if (typeof customBuildDecision === "boolean") {
        fit.fitDecision = customBuildDecision ? "custom_build" : "software_fit";
      } else {
        const canExisting = parsed?.solution_direction?.can_existing_software_solve;
        if (typeof canExisting === "boolean") {
          fit.fitDecision = canExisting ? "software_fit" : "custom_build";
        }
      }
    } catch (error) {
      console.warn("[runRecommendationFlow] fit decision sync skipped:", error);
    }
  }

  const { data: created, error: createError } = await supabase
    .from("recommendations")
    .insert({
      user_id: userId,
      profile_fingerprint: profileFingerprint,
      profile_snapshot: profile,
      candidate_ids: candidateIds,
      items,
      fit_decision: fit.fitDecision,
      fit_reason: fit.fitReason
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`RECOMMENDATION_INSERT_ERROR:${createError.message}`);
  }

  return {
    recommendationId: created.id,
    items,
    fitDecision: fit.fitDecision,
    fitReason: fit.fitReason
  };
}
