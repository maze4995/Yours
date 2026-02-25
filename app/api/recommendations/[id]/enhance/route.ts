import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreCatalogCandidates } from "@/lib/recommendation/scoring";
import { generateFitAnalysis, generateRecommendationItems } from "@/lib/recommendation/openai";
import { decideFitDecision } from "@/lib/recommendation/scoring";
import type { ProfileInput, SoftwareCatalogItem } from "@/lib/types";

// Allow up to 5 minutes for the full AI pipeline on Vercel Pro
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: rec } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rec) {
    return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  }

  // Skip if already AI-enhanced (fit_reason doesn't have _aiEnhanced:false)
  try {
    const existing = JSON.parse(rec.fit_reason ?? "{}") as Record<string, unknown>;
    if (existing._aiEnhanced !== false) {
      return NextResponse.json({ ok: true, alreadyEnhanced: true });
    }
  } catch {
    // If fit_reason can't be parsed, proceed with enhancement
  }

  const profile = rec.profile_snapshot as ProfileInput;

  const { data: catalogRows, error: catalogError } = await supabase
    .from("software_catalog")
    .select("*")
    .eq("is_active", true);

  if (catalogError) {
    return NextResponse.json({ code: "CATALOG_ERROR", message: catalogError.message }, { status: 500 });
  }

  const catalog = (catalogRows ?? []) as unknown as SoftwareCatalogItem[];
  const scored = scoreCatalogCandidates(profile, catalog);

  try {
    const items = await generateRecommendationItems(profile, scored);
    const fit = decideFitDecision(items);
    const aiAnalysis = await generateFitAnalysis(profile, fit.fitDecision, items, scored.slice(0, 3));

    // Sync fit_decision from AI result
    if (aiAnalysis) {
      try {
        const parsed = JSON.parse(aiAnalysis) as {
          custom_build_framework?: { final_decision?: { custom_build?: boolean } };
          solution_direction?: { can_existing_software_solve?: boolean };
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
      } catch {
        // keep original fitDecision
      }
    }

    await supabase
      .from("recommendations")
      .update({
        items,
        fit_decision: fit.fitDecision,
        fit_reason: aiAnalysis ?? rec.fit_reason,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    revalidatePath("/results");
    revalidatePath("/dashboard");

    return NextResponse.json({ ok: true, recommendationId: id });
  } catch (error) {
    console.error("[enhance] AI pipeline failed:", error);
    return NextResponse.json(
      { code: "AI_ERROR", message: error instanceof Error ? error.message : "AI 분석에 실패했습니다." },
      { status: 500 }
    );
  }
}
