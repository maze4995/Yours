import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileInput, RecommendationResult, SoftwareCatalogItem } from "@/lib/types";
import { createProfileFingerprint, decideFitDecision, scoreCatalogCandidates } from "@/lib/recommendation/scoring";
import { generateFitAnalysis, generateRecommendationItems } from "@/lib/recommendation/openai";

export async function runRecommendationFlow(params: {
  supabase: SupabaseClient;
  userId: string;
  profile: ProfileInput;
}): Promise<RecommendationResult> {
  const { supabase, userId, profile } = params;
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
  }
  const candidateIds = scored.slice(0, 8).map((candidate) => candidate.item.id);

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
