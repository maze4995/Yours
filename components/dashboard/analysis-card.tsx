"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

function readSnapshotField(snapshot: Record<string, unknown> | null, keys: string[]): string {
  for (const key of keys) {
    const value = snapshot?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
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

export function AnalysisCard({ data, isLatest }: { data: AnalysisCardData; isLatest: boolean }) {
  const snapshot = data.profile_snapshot;
  const jobTitle = readSnapshotField(snapshot, ["jobTitle", "job_title"]);
  const industry = readSnapshotField(snapshot, ["industry"]);
  const teamSize = readSnapshotField(snapshot, ["teamSize", "team_size"]);
  const isCustomBuild = data.fit_decision === "custom_build";

  const topItems = [...data.items]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {jobTitle ? <span className="font-medium text-foreground">{jobTitle}</span> : null}
            {industry ? <span>{industry}</span> : null}
            {teamSize ? <span>{teamSize}명 팀</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(data.updated_at)} 분석</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isLatest ? <Badge variant="secondary">최신</Badge> : null}
          <Badge variant={isCustomBuild ? "warning" : "success"}>
            {isCustomBuild ? "맞춤 개발 권장" : "기존 소프트웨어 우선"}
          </Badge>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        {topItems.length > 0 ? (
          <p>
            <span className="text-muted-foreground">추천 후보: </span>
            <span className="font-medium">{topItems.join(", ")}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">추천 후보가 없거나 맞춤 개발 중심 분석입니다.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {isCustomBuild ? (
          <Link href={`/request/new?recommendationId=${data.id}`}>
            <Button size="sm" variant="outline" className="gap-1">
              의뢰서 만들기 <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : null}
        <Link href={`/results?recommendationId=${data.id}`}>
          <Button size="sm" className="gap-1">
            리포트 보기 <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
