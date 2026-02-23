"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, Sparkles, AlertCircle, Target, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AnalysisItem = { pain: string; detail: string };
type GoalRefinement = { original: string; refined: string };

type FitAnalysis = {
  painAnalysis: AnalysisItem[];
  goalRefinements: GoalRefinement[];
  recommendation: string;
};

type RecommendationItem = {
  name?: string;
  score?: number;
  solvable?: boolean;
};

export type AnalysisCardData = {
  id: string;
  fit_decision: "software_fit" | "custom_build";
  fit_reason: string | null;
  created_at: string;
  updated_at: string;
  profile_snapshot: Record<string, unknown> | null;
  items: RecommendationItem[];
};

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

function readSnapshotField(
  snapshot: Record<string, unknown> | null,
  keys: string[]
): string {
  for (const key of keys) {
    const v = snapshot?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function AnalysisCard({
  data,
  isLatest
}: {
  data: AnalysisCardData;
  isLatest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const analysis = parseFitAnalysis(data.fit_reason);
  const snapshot = data.profile_snapshot;

  const jobTitle = readSnapshotField(snapshot, ["jobTitle", "job_title"]);
  const industry = readSnapshotField(snapshot, ["industry"]);
  const teamSize = readSnapshotField(snapshot, ["teamSize", "team_size"]);

  const topItems = [...data.items]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map((i) => i.name)
    .filter(Boolean) as string[];

  const isCustomBuild = data.fit_decision === "custom_build";

  return (
    <div className="rounded-xl border border-border overflow-hidden transition-colors hover:border-primary/30">
      {/* 카드 헤더 (항상 표시) */}
      <div className="p-4 space-y-3">
        {/* 상단 메타 정보 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {jobTitle && <span className="font-medium text-foreground">{jobTitle}</span>}
            {industry && <><span>·</span><span>{industry}</span></>}
            {teamSize && <><span>·</span><span>{teamSize}명 팀</span></>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isLatest && <Badge variant="secondary" className="text-xs">최신</Badge>}
            <Badge
              variant={isCustomBuild ? "warning" : "success"}
              className="text-xs"
            >
              {isCustomBuild ? "맞춤 개발 권장" : "기존 소프트웨어"}
            </Badge>
          </div>
        </div>

        {/* 추천 소프트웨어 요약 */}
        {topItems.length > 0 ? (
          <p className="text-sm">
            <span className="text-muted-foreground">추천: </span>
            <span className="font-medium">{topItems.join(", ")}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isCustomBuild ? "맞춤 개발 프로그램이 권장됩니다." : "추천 항목이 없습니다."}
          </p>
        )}

        {/* 하단 날짜 + 액션 버튼 */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{formatDate(data.updated_at)}</span>
          <div className="flex items-center gap-2">
            {isCustomBuild ? (
              <Link href={`/request/new`}>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                  의뢰서 작성 <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            ) : (
              <Link href="/results">
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                  결과 보기 <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
            {analysis && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={() => setOpen((v) => !v)}
              >
                <Sparkles className="h-3 w-3 text-primary" />
                AI 분석
                {open ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 분석 리포트 패널 (토글) */}
      {open && analysis && (
        <div className="border-t border-border bg-muted/30 p-5 space-y-5 animate-fade-in-up">
          {/* 불편 사항 분석 */}
          {analysis.painAnalysis.length > 0 && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                불편 사항 분석
              </h4>
              <div className="space-y-2">
                {analysis.painAnalysis.map((item, i) => (
                  <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {item.pain}
                    </p>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed dark:text-amber-400">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 목표 정제 */}
          {analysis.goalRefinements.length > 0 && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" />
                목표 정제
              </h4>
              <div className="space-y-2">
                {analysis.goalRefinements.map((item, i) => (
                  <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground line-through">{item.original}</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed">{item.refined}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 종합 추천 */}
          {analysis.recommendation && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-primary" />
                종합 의견
              </h4>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {analysis.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
