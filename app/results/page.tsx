import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Wrench,
  User,
  Target,
  Zap,
  ChevronRight,
  Star,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RegenerateButton } from "@/components/results/regenerate-button";
import type { ProfileInput, RecommendationItem } from "@/lib/types";
import type { FitAnalysis } from "@/lib/recommendation/openai";

// fit_reason이 JSON 구조체인지 확인
function parseFitAnalysis(fitReason: string | null): FitAnalysis | null {
  if (!fitReason) return null;
  try {
    const parsed = JSON.parse(fitReason);
    if (parsed.painAnalysis && parsed.goalRefinements && parsed.recommendation) {
      return parsed as FitAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

function isAiGenerated(fitReason: string | null): boolean {
  return (fitReason?.length ?? 0) > 80;
}

// ── 소프트웨어 아바타 색상 (이름 기반 해시) ────────────────────
const AVATAR_PALETTE = [
  { bg: "bg-gray-900", text: "text-white" },
  { bg: "bg-blue-600", text: "text-white" },
  { bg: "bg-violet-600", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-emerald-600", text: "text-white" },
  { bg: "bg-rose-600", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
  { bg: "bg-indigo-600", text: "text-white" },
];

function getAvatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

const PRICING_LABEL: Record<string, string> = {
  "Free": "무료",
  "Freemium": "무료로 시작 가능",
  "Free + Team": "팀 플랜 유료",
  "Free + Business": "비즈니스 플랜 유료",
  "Free + Premium": "프리미엄 유료",
  "Free + Starter": "스타터 유료",
  "Paid": "유료",
  "Enterprise": "엔터프라이즈",
  "Suite": "스위트 플랜",
  "Standard + Premium": "스탠다드/프리미엄",
};

export default async function ResultsPage() {
  const { supabase, user } = await requireAuth();

  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recommendation) {
    redirect("/onboarding");
  }

  const items = (recommendation.items ?? []) as RecommendationItem[];
  const profile = recommendation.profile_snapshot as ProfileInput | null;
  const isSoftwareFit = recommendation.fit_decision === "software_fit";
  const fitReason = recommendation.fit_reason as string | null;
  const aiGenerated = isAiGenerated(fitReason);
  const analysis = parseFitAnalysis(fitReason);

  // 소프트웨어 카탈로그 추가 정보
  const softwareIds = items.map((item) => item.softwareId);
  const { data: catalogItems } =
    softwareIds.length > 0
      ? await supabase
          .from("software_catalog")
          .select("id, website_url, pricing_model, category")
          .in("id", softwareIds)
      : { data: [] };

  const catalogMap = new Map((catalogItems ?? []).map((item) => [item.id, item]));

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-4">

      {/* 상단 타이틀 + 재생성 버튼 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">추천 결과</h1>
        <RegenerateButton />
      </div>

      {/* ── 1. 개인화 분석 리포트 ── */}
      {profile && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* 리포트 헤더 */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {profile.fullName ? `${profile.fullName}님의 업무 분석 리포트` : "업무 분석 리포트"}
              </span>
            </div>
            {aiGenerated ? (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> AI 분석
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                기본 분석 · AI 재분석 시 업그레이드
              </span>
            )}
          </div>

          <div className="space-y-6 px-6 py-6">
            {/* 프로필 요약 칩 */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <User className="h-3 w-3" />
                {profile.industry || "업종 미입력"} · {profile.jobTitle || "직무 미입력"}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                팀 {profile.teamSize}명
              </span>
              {profile.currentTools.length > 0 && !profile.currentTools.includes("없음") && (
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  현재 사용: {profile.currentTools.join(", ")}
                </span>
              )}
            </div>

            {/* 불편사항 분석 */}
            {(analysis?.painAnalysis ?? profile.painPoints).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-xs font-semibold text-amber-700">현재 겪고 있는 불편사항 분석</p>
                </div>
                <div className="grid gap-2.5">
                  {analysis?.painAnalysis
                    ? analysis.painAnalysis.map((item) => (
                        <div key={item.pain} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="mb-1 text-xs font-bold text-amber-700">{item.pain}</p>
                          <p className="text-sm leading-relaxed text-amber-900">{item.detail}</p>
                        </div>
                      ))
                    : profile.painPoints.map((p) => (
                        <div key={p} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-sm font-medium text-amber-800">{p}</p>
                        </div>
                      ))}
                </div>
              </div>
            )}

            {/* 목표 분석 */}
            {(analysis?.goalRefinements ?? profile.goals).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary">AI가 제안하는 구체적 목표</p>
                </div>
                <div className="grid gap-2.5">
                  {analysis?.goalRefinements
                    ? analysis.goalRefinements.map((item) => (
                        <div key={item.original} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                              {item.original}
                            </span>
                            <ChevronRight className="h-3 w-3 text-primary/50" />
                            <span className="text-xs text-primary/70 font-medium">AI 제안</span>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground">{item.refined}</p>
                        </div>
                      ))
                    : profile.goals.map((g) => (
                        <div key={g} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <p className="text-sm font-medium text-primary">{g}</p>
                        </div>
                      ))}
                </div>
              </div>
            )}

            {/* 최종 권고 */}
            {(analysis?.recommendation ?? fitReason) && (
              <div className={`rounded-xl border px-4 py-3 ${aiGenerated ? "bg-primary/5 border-primary/20" : "bg-muted/60 border-border"}`}>
                <div className="mb-2 flex items-center gap-1.5">
                  <Zap className={`h-3.5 w-3.5 ${aiGenerated ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-xs font-semibold ${aiGenerated ? "text-primary" : "text-muted-foreground"}`}>
                    {isSoftwareFit ? "기존 소프트웨어를 추천하는 이유" : "맞춤 개발이 더 적합한 이유"}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {analysis?.recommendation ?? fitReason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. 판정 배너 ── */}
      <div className={`rounded-2xl p-5 ${isSoftwareFit ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isSoftwareFit ? "bg-emerald-100" : "bg-amber-100"}`}>
            {isSoftwareFit
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              : <Wrench className="h-5 w-5 text-amber-600" />
            }
          </div>
          <div>
            <p className={`font-bold ${isSoftwareFit ? "text-emerald-800" : "text-amber-800"}`}>
              {isSoftwareFit
                ? "기존 앱/서비스로 해결할 수 있어요!"
                : "나만을 위한 프로그램을 새로 만드는 게 더 적합해요"}
            </p>
            <p className={`mt-1 text-sm ${isSoftwareFit ? "text-emerald-700" : "text-amber-700"}`}>
              {isSoftwareFit
                ? "이미 시중에 나와 있는 도구를 바로 사용하면 돼요. 아래 TOP 3를 확인해 보세요."
                : "시중에 비슷한 도구는 있지만, 내 상황을 100% 해결하기엔 부족해요. 아래 도구들을 참고하고, 필요하다면 맞춤 개발을 고려해 보세요."}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. 소프트웨어 카드 ── */}
      {items.length > 0 && (
        <div className="space-y-4">
          {!isSoftwareFit && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700">
                아래 도구들은 실제로 존재하는 앱/서비스예요
              </p>
              <p className="mt-0.5 text-xs text-amber-600">
                완전한 해결은 어렵지만, 일부 기능을 먼저 써보거나 참고할 수 있어요. 한계가 느껴진다면 아래 맞춤 개발 의뢰를 활용해 보세요.
              </p>
            </div>
          )}
          <p className="text-sm font-medium text-muted-foreground">
            {isSoftwareFit ? "AI 추천 소프트웨어 TOP 3" : "유사 도구 3가지 (AI 선정)"}
          </p>

          {items.map((item, index) => {
            const catalog = catalogMap.get(item.softwareId);
            const pricingLabel = catalog?.pricing_model
              ? (PRICING_LABEL[catalog.pricing_model] ?? catalog.pricing_model)
              : null;

            const avatarColor = getAvatarColor(item.name);

            return (
              <div key={item.softwareId} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {/* ── 카드 헤더 — 스크린샷 스타일 ── */}
                <div className="flex items-center gap-4 border-b border-border px-5 py-4">
                  {/* 컬러 아바타 */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold",
                        avatarColor.bg,
                        avatarColor.text,
                      )}
                    >
                      {item.name.charAt(0)}
                    </div>
                    {index === 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-sm">
                        <Star className="h-3 w-3 fill-white text-white" />
                      </span>
                    )}
                  </div>

                  {/* 이름 + 점수 + 바 + 카테고리 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold">{item.name}</h2>
                        {pricingLabel && (
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", pricingLabel.includes("무료") ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                            {pricingLabel}
                          </span>
                        )}
                        {aiGenerated && (
                          <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            <Sparkles className="h-2.5 w-2.5" /> AI
                          </span>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-base font-bold text-primary">
                        {item.score}점
                      </span>
                    </div>

                    {/* 점수 진행 바 */}
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>

                    {/* 카테고리 + 공식 사이트 링크 */}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {catalog?.category ?? ""}
                      </span>
                      {catalog?.website_url && (
                        <a
                          href={catalog.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          공식 사이트 <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 카드 바디 */}
                <div className="space-y-5 px-6 py-5">
                  <div className="rounded-xl bg-primary/5 px-4 py-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary">나에게 추천된 이유</p>
                    </div>
                    <p className="text-sm leading-relaxed">{item.whyRecommended}</p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">주요 기능</p>
                    <div className="flex flex-wrap gap-2">
                      {item.keyFeatures.map((feature) => (
                        <span key={feature} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-emerald-50 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-emerald-700">이런 점이 좋아요</p>
                      <ul className="space-y-1.5">
                        {item.pros.map((pro) => (
                          <li key={pro} className="flex items-start gap-2 text-sm text-emerald-800">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-amber-700">이런 점은 주의하세요</p>
                      <ul className="space-y-1.5">
                        {item.cautions.map((caution) => (
                          <li key={caution} className="flex items-start gap-2 text-sm text-amber-800">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            {caution}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${item.solvable ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {item.solvable ? (
                      <><CheckCircle2 className="h-4 w-4 shrink-0" /> 이 도구로 문제를 충분히 해결할 수 있어요</>
                    ) : (
                      <><AlertTriangle className="h-4 w-4 shrink-0" /> 부분적으로 도움이 되지만, 완전한 해결은 어려울 수 있어요</>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. 맞춤 개발 CTA ── */}
      <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center">
        <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h3 className="text-lg font-bold">
          {isSoftwareFit ? "그래도 딱 맞는 도구가 없다면?" : "나만을 위한 프로그램을 만들어 보세요"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {isSoftwareFit
            ? "시중 앱이 내 업무 방식과 완전히 맞지 않을 수 있어요. AI의 도움으로 쉽게 의뢰서를 작성하면, 검증된 개발자들이 직접 가격을 제안해요."
            : "AI가 의뢰서 작성을 도와드려요. 내 상황을 쉬운 말로 설명하면 AI가 개발자에게 전달할 내용을 정리해 드립니다. 여러 개발자의 가격 제안을 비교해 선택하세요."}
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
