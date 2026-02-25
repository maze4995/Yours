import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Wrench,
  Target,
  Lightbulb,
  ChevronRight
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RegenerateButton } from "@/components/results/regenerate-button";
import { AiEnhanceTrigger } from "@/components/results/ai-enhance-trigger";
import { SoftwareAvatar } from "@/components/results/software-avatar";
import type { ProfileInput, RecommendationItem } from "@/lib/types";
import type { FitAnalysis as StructuredFitAnalysis } from "@/lib/recommendation/openai";

type LegacyFitAnalysis = {
  painAnalysis: { pain: string; detail: string }[];
  goalRefinements: { original: string; refined: string }[];
  recommendation: string;
};

type ProactiveInsight = {
  problem: string;
  reasoning: string;
  swSolution: string;
};

type RecommendedFeature = {
  name: string;
  description: string;
  whyNeeded: string;
};

type ParsedFitAnalysis = {
  painAnalysis: { pain: string; detail: string }[];
  goalRefinements: { original: string; refined: string }[];
  recommendation: string;
  solutionReason?: string;
  proactiveInsights?: ProactiveInsight[];
  recommendedFeaturesStructured?: RecommendedFeature[];
};

function parseFitAnalysis(fitReason: string | null): ParsedFitAnalysis | null {
  if (!fitReason) return null;

  try {
    const parsed = JSON.parse(fitReason) as
      | LegacyFitAnalysis
      | StructuredFitAnalysis
      | Record<string, unknown>;

    if (
      typeof (parsed as StructuredFitAnalysis).user_identity === "string" &&
      Array.isArray((parsed as StructuredFitAnalysis).core_bottlenecks) &&
      typeof (parsed as StructuredFitAnalysis).solution_direction?.reason === "string"
    ) {
      const structured = parsed as StructuredFitAnalysis;

      const goalRefinements =
        structured.solution_direction.recommended_features_if_custom.length > 0
          ? structured.solution_direction.recommended_features_if_custom.map((feature, index) => ({
              original: `개선 ${index + 1}`,
              refined: feature
            }))
          : [
              {
                original: "개선 방향",
                refined: structured.solution_direction.reason
              }
            ];

      return {
        painAnalysis: structured.core_bottlenecks.map((item) => ({
          pain: item.title,
          detail: [item.analysis, item.impact ? `영향: ${item.impact}` : ""].filter(Boolean).join(" ")
        })),
        goalRefinements,
        recommendation: [structured.user_identity, structured.solution_direction.reason]
          .filter(Boolean)
          .join("\n\n"),
        solutionReason: structured.solution_direction.reason,
        proactiveInsights: structured.proactiveInsights ?? [],
        recommendedFeaturesStructured: structured.solution_direction.recommended_features_structured ?? []
      };
    }

    if (
      (parsed as LegacyFitAnalysis).painAnalysis &&
      (parsed as LegacyFitAnalysis).goalRefinements &&
      (parsed as LegacyFitAnalysis).recommendation
    ) {
      return parsed as LegacyFitAnalysis;
    }

    return null;
  } catch {
    return null;
  }
}

function isAiGenerated(fitReason: string | null): boolean {
  return (fitReason?.length ?? 0) > 80;
}

const AVATAR_PALETTE = [
  { bg: "bg-gray-900", text: "text-white" },
  { bg: "bg-blue-600", text: "text-white" },
  { bg: "bg-violet-600", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-emerald-600", text: "text-white" },
  { bg: "bg-rose-600", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
  { bg: "bg-indigo-600", text: "text-white" }
];

function getAvatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

const PRICING_LABEL: Record<string, string> = {
  Free: "무료",
  Freemium: "프리미엄(부분 무료)",
  "Free + Team": "팀 플랜 유료",
  "Free + Business": "비즈니스 플랜 유료",
  "Free + Premium": "프리미엄 유료",
  "Free + Starter": "스타터 유료",
  Paid: "유료",
  Enterprise: "엔터프라이즈",
  Suite: "통합 플랜",
  "Standard + Premium": "스탠다드/프리미엄"
};

export default async function ResultsPage({
  searchParams
}: {
  searchParams?: Promise<{ recommendationId?: string }>;
}) {
  const { supabase, user } = await requireAuth();
  const params = await searchParams;
  const recommendationId = params?.recommendationId?.trim();

  const query = supabase.from("recommendations").select("*").eq("user_id", user.id);

  const { data: recommendation } = recommendationId
    ? await query.eq("id", recommendationId).limit(1).maybeSingle()
    : await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!recommendation) {
    redirect(recommendationId ? "/dashboard" : "/onboarding");
  }

  const items = (recommendation.items ?? []) as RecommendationItem[];
  const profile = recommendation.profile_snapshot as ProfileInput | null;
  const isSoftwareFit = recommendation.fit_decision === "software_fit";
  const fitReason = recommendation.fit_reason as string | null;
  const aiGenerated = isAiGenerated(fitReason);
  const analysis = parseFitAnalysis(fitReason);

  // Detect if AI enhancement is still pending (saved with skipAI:true)
  let needsAiEnhancement = false;
  try {
    const rawParsed = JSON.parse(fitReason ?? "{}") as Record<string, unknown>;
    needsAiEnhancement = rawParsed._aiEnhanced === false;
  } catch {
    needsAiEnhancement = false;
  }

  const softwareIds = items.map((item) => item.softwareId);
  const { data: catalogItems } =
    softwareIds.length > 0
      ? await supabase
          .from("software_catalog")
          .select("id, website_url, pricing_model, category")
          .in("id", softwareIds)
      : { data: [] };

  const catalogMap = new Map((catalogItems ?? []).map((item) => [item.id, item]));
  const hasProactiveInsights = (analysis?.proactiveInsights ?? []).length > 0;

  return (
    <section className="mx-auto max-w-6xl space-y-8 py-6">
      {needsAiEnhancement && <AiEnhanceTrigger recommendationId={recommendation.id} />}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">추천 결과</h1>
        <RegenerateButton />
      </div>

      {profile && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-5 py-4 text-base shadow-sm">
          <span className="font-semibold text-foreground">{profile.fullName || "사용자"}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{profile.jobTitle}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{profile.industry}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">팀 {profile.teamSize}명</span>
          {profile.currentTools.length > 0 && !profile.currentTools.includes("없음") && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{profile.currentTools.join(", ")}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {aiGenerated && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Sparkles className="h-3 w-3" /> AI 분석
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-3 py-1 text-base font-semibold",
                isSoftwareFit ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}
            >
              {isSoftwareFit ? "기존 SW 적합" : "맞춤 개발 권장"}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">AI 진단 리포트</h2>
        <p className="text-base text-muted-foreground">
          프로파일 정보를 기반으로 AI가 현재 문제와 개선 방향을 분석한 결과입니다.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-4 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-amber-800">문제 상황 분석</p>
          </div>
          <div className="space-y-3">
            {analysis?.painAnalysis && analysis.painAnalysis.length > 0
              ? analysis.painAnalysis.map((item, index) => (
                  <div
                    key={`pain-${index}`}
                    className="rounded-xl border border-amber-200 bg-white px-4 py-3 shadow-xs"
                  >
                    <p className="text-base font-semibold text-amber-700">{item.pain}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80 line-clamp-5">
                      {item.detail}
                    </p>
                  </div>
                ))
              : profile?.painPoints.map((pain, index) => (
                  <div
                    key={`raw-pain-${index}`}
                    className="rounded-xl border border-amber-200 bg-white px-4 py-3"
                  >
                    <p className="text-base font-medium text-amber-800">{pain}</p>
                  </div>
                ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
              <Lightbulb className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-lg font-bold text-violet-800">AI가 발견한 잠재 문제</p>
          </div>
          {hasProactiveInsights ? (
            <div className="space-y-3">
              {(analysis!.proactiveInsights!).map((insight, index) => (
                <div
                  key={`insight-${index}`}
                  className="rounded-xl border border-violet-200 bg-white px-4 py-3 shadow-xs"
                >
                  <p className="text-base font-semibold text-violet-700">{insight.problem}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-violet-600/90">{insight.reasoning}</p>
                  <p className="mt-2.5 rounded-lg bg-violet-100 px-3 py-2 text-sm leading-relaxed text-violet-800">
                    <span className="font-semibold">제안:</span> {insight.swSolution}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="mb-2 h-7 w-7 text-violet-300" />
              <p className="text-sm text-violet-400">현재 분석된 추가 잠재 문제가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <Target className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-lg font-bold text-emerald-800">개선 방향 및 필요 기능</p>
          </div>

          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xs",
              isSoftwareFit ? "border-emerald-200 bg-white" : "border-amber-200 bg-white"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                isSoftwareFit ? "bg-emerald-100" : "bg-amber-100"
              )}
            >
              {isSoftwareFit ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Wrench className="h-3.5 w-3.5 text-amber-600" />
              )}
            </div>
            <div>
              <p className={cn("text-base font-semibold", isSoftwareFit ? "text-emerald-800" : "text-amber-800")}>
                {isSoftwareFit ? "기존 소프트웨어로 시작해도 됩니다." : "맞춤 개발이 더 적합한 상황입니다."}
              </p>
              <p className={cn("mt-1 text-sm leading-relaxed", isSoftwareFit ? "text-emerald-700" : "text-amber-700")}>
                {isSoftwareFit
                  ? "우선 추천 도구로 빠르게 시작하고, 부족한 부분을 단계적으로 보완하는 접근을 권장합니다."
                  : "시중 도구만으로는 핵심 문제를 해결하기 어려워, 업무 흐름에 맞춘 기능 설계가 필요합니다."}
              </p>
            </div>
          </div>

          {analysis?.recommendedFeaturesStructured && analysis.recommendedFeaturesStructured.length > 0 ? (
            <div className="space-y-3">
              {analysis.recommendedFeaturesStructured.slice(0, 4).map((feature, index) => (
                <div
                  key={`feature-${index}`}
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-xs"
                >
                  <p className="text-base font-semibold text-emerald-800">{feature.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-emerald-700">{feature.description}</p>
                  <div className="mt-2.5 rounded-lg bg-emerald-100 px-3 py-2">
                    <p className="mb-0.5 text-sm font-semibold text-emerald-700">왜 필요한가요?</p>
                    <p className="text-sm leading-relaxed text-emerald-800">{feature.whyNeeded}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : analysis?.goalRefinements && analysis.goalRefinements.length > 0 ? (
            <div className="space-y-2.5">
              {analysis.goalRefinements.slice(0, 4).map((item, index) => (
                <div
                  key={`goal-${index}`}
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-xs"
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                      {item.original}
                    </span>
                    <ChevronRight className="h-3 w-3 text-emerald-400" />
                  </div>
                  <p className="text-sm leading-relaxed text-emerald-900 line-clamp-4">{item.refined}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-4 border-t border-border/60 pt-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {isSoftwareFit ? "추천 소프트웨어" : "유사 솔루션"}
              </p>
              {aiGenerated && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Sparkles className="h-3 w-3" /> AI 선정
                </span>
              )}
            </div>
            {!isSoftwareFit && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-700">
                참고용 비교
              </span>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((item, index) => {
              const catalog = catalogMap.get(item.softwareId);
              const pricingLabel = catalog?.pricing_model
                ? (PRICING_LABEL[catalog.pricing_model] ?? catalog.pricing_model)
                : null;
              const avatarColor = getAvatarColor(item.name);

              return (
                <div
                  key={`${item.softwareId}-${index}`}
                  className="overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
                    <SoftwareAvatar
                      name={item.name}
                      websiteUrl={catalog?.website_url}
                      isTop={index === 0}
                      bg={avatarColor.bg}
                      textColor={avatarColor.text}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">{item.name}</h2>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            {pricingLabel && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-sm font-medium",
                                  pricingLabel.includes("무료")
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-blue-100 text-blue-700"
                                )}
                              >
                                {pricingLabel}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xl font-bold text-primary">{item.score}점</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-500"
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 px-4 py-4">
                    <div className="rounded-lg bg-primary/5 px-3 py-2">
                      <div className="mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <p className="text-sm font-semibold text-primary">추천 이유</p>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80">{item.whyRecommended}</p>
                    </div>

                    {item.keyFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.keyFeatures.slice(0, 3).map((feature, fi) => (
                          <span
                            key={`${feature}-${fi}`}
                            className="rounded-full border border-border bg-background px-2.5 py-1 text-sm text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}

                    {(item.pros.length > 0 || item.cautions.length > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        {item.pros.length > 0 && (
                          <div>
                            <p className="mb-1 text-sm font-semibold text-emerald-700">장점</p>
                            <ul className="space-y-1">
                              {item.pros.slice(0, 2).map((pro, pi) => (
                                <li
                                  key={`pro-${pi}`}
                                  className="flex items-start gap-1.5 text-sm text-emerald-800/80"
                                >
                                  <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-500" />
                                  <span className="line-clamp-2">{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.cautions.length > 0 && (
                          <div>
                            <p className="mb-1 text-sm font-semibold text-amber-700">주의</p>
                            <ul className="space-y-1">
                              {item.cautions.slice(0, 2).map((caution, ci) => (
                                <li
                                  key={`caution-${ci}`}
                                  className="flex items-start gap-1.5 text-sm text-amber-800/80"
                                >
                                  <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-amber-500" />
                                  <span className="line-clamp-2">{caution}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-sm font-medium",
                          item.solvable ? "text-emerald-600" : "text-muted-foreground"
                        )}
                      >
                        {item.solvable ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            해결 가능
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            부분 해결
                          </>
                        )}
                      </div>
                      {catalog?.website_url && (
                        <a
                          href={catalog.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          사이트 <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 px-8 py-10 text-center">
        <Wrench className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="text-2xl font-bold">
          {isSoftwareFit ? "그래도 딱 맞는 도구가 없다면?" : "우리만의 업무 시스템을 만들어 보세요"}
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {isSoftwareFit
            ? "추천 도구로 먼저 시작한 뒤 한계가 보이면 맞춤 개발 의뢰로 전환할 수 있습니다. 검증된 개발자들의 제안을 비교해 선택해 보세요."
            : "AI가 의뢰서 작성을 도와드리고, 개발자들이 가격과 일정을 제안합니다. 비교 후 가장 적합한 제안을 선택해 보세요."}
        </p>
        <Link href={`/request/new?recommendationId=${recommendation.id}`} className="mt-5 inline-block">
          <Button size="lg" className="gap-2 px-8">
            AI와 함께 의뢰서 작성하기 <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
