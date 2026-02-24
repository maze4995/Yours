"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleDollarSign, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type OpenRequest = {
  request_id: string;
  title: string;
  summary: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline_date: string | null;
  priority: "low" | "medium" | "high";
  created_at: string;
};

type SortKey = "recent" | "priority" | "deadline" | "budget_high" | "budget_low";
type PriorityFilter = "all" | "high" | "medium" | "low";
type BudgetFilter = "all" | "with_budget" | "no_budget";
type DeadlineFilter = "all" | "with_deadline" | "no_deadline";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "recent", label: "최신순" },
  { key: "priority", label: "우선순위순" },
  { key: "deadline", label: "마감 임박순" },
  { key: "budget_high", label: "예산 높은순" },
  { key: "budget_low", label: "예산 낮은순" }
];

const PRIORITY_OPTIONS: Array<{ key: PriorityFilter; label: string }> = [
  { key: "all", label: "전체 우선순위" },
  { key: "high", label: "긴급" },
  { key: "medium", label: "보통" },
  { key: "low", label: "여유" }
];

const BUDGET_OPTIONS: Array<{ key: BudgetFilter; label: string }> = [
  { key: "all", label: "예산 전체" },
  { key: "with_budget", label: "예산 명시" },
  { key: "no_budget", label: "예산 협의" }
];

const DEADLINE_OPTIONS: Array<{ key: DeadlineFilter; label: string }> = [
  { key: "all", label: "마감 전체" },
  { key: "with_deadline", label: "마감일 있음" },
  { key: "no_deadline", label: "마감일 미정" }
];

const KEYWORD_STOPWORDS = new Set([
  "개발",
  "시스템",
  "요청",
  "프로젝트",
  "업무",
  "필요",
  "원함",
  "도입",
  "구축",
  "기능"
]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return "협의";
  if (min && max) return `${min.toLocaleString()} ~ ${max.toLocaleString()}원`;
  if (min) return `${min.toLocaleString()}원 이상`;
  return `${(max as number).toLocaleString()}원 이하`;
}

function priorityLabel(priority: "low" | "medium" | "high") {
  if (priority === "high") return "긴급";
  if (priority === "medium") return "보통";
  return "여유";
}

function priorityVariant(priority: "low" | "medium" | "high"): "warning" | "secondary" | "outline" {
  if (priority === "high") return "warning";
  if (priority === "medium") return "secondary";
  return "outline";
}

function hasBudget(item: OpenRequest) {
  return item.budget_min !== null || item.budget_max !== null;
}

function hasDeadline(item: OpenRequest) {
  return item.deadline_date !== null;
}

function budgetAnchor(item: OpenRequest) {
  return item.budget_max ?? item.budget_min ?? 0;
}

function extractKeywords(title: string, summary: string | null): string[] {
  const source = `${title} ${summary ?? ""}`;
  const tokens = source
    .toLowerCase()
    .split(/[^0-9a-zA-Z가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !KEYWORD_STOPWORDS.has(token));

  const unique: string[] = [];
  for (const token of tokens) {
    if (!unique.includes(token)) unique.push(token);
    if (unique.length >= 5) break;
  }

  return unique;
}

export function RequestsBoard({ rows }: { rows: OpenRequest[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");

  const hasActiveFilter =
    sortKey !== "recent" ||
    priorityFilter !== "all" ||
    budgetFilter !== "all" ||
    deadlineFilter !== "all";

  const sorted = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (priorityFilter !== "all" && row.priority !== priorityFilter) return false;
      if (budgetFilter === "with_budget" && !hasBudget(row)) return false;
      if (budgetFilter === "no_budget" && hasBudget(row)) return false;
      if (deadlineFilter === "with_deadline" && !hasDeadline(row)) return false;
      if (deadlineFilter === "no_deadline" && hasDeadline(row)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "priority") {
        const rank: Record<OpenRequest["priority"], number> = { high: 3, medium: 2, low: 1 };
        const diff = rank[b.priority] - rank[a.priority];
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      if (sortKey === "deadline") {
        const aValue = a.deadline_date ? new Date(a.deadline_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bValue = b.deadline_date ? new Date(b.deadline_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aValue - bValue;
      }

      if (sortKey === "budget_high") {
        return budgetAnchor(b) - budgetAnchor(a);
      }

      if (sortKey === "budget_low") {
        const aValue = hasBudget(a) ? budgetAnchor(a) : Number.MAX_SAFE_INTEGER;
        const bValue = hasBudget(b) ? budgetAnchor(b) : Number.MAX_SAFE_INTEGER;
        return aValue - bValue;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows, sortKey, priorityFilter, budgetFilter, deadlineFilter]);

  const urgentCount = sorted.filter((row) => row.priority === "high").length;
  const budgetDefinedCount = sorted.filter((row) => hasBudget(row)).length;
  const deadlineDefinedCount = sorted.filter((row) => hasDeadline(row)).length;

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">정렬</span>
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={sortKey === option.key ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setSortKey(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">우선순위</span>
            {PRIORITY_OPTIONS.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={priorityFilter === option.key ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setPriorityFilter(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">예산/마감</span>
            {BUDGET_OPTIONS.map((option) => (
              <Button
                key={`budget-${option.key}`}
                size="sm"
                variant={budgetFilter === option.key ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setBudgetFilter(option.key)}
              >
                {option.label}
              </Button>
            ))}
            {DEADLINE_OPTIONS.map((option) => (
              <Button
                key={`deadline-${option.key}`}
                size="sm"
                variant={deadlineFilter === option.key ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setDeadlineFilter(option.key)}
              >
                {option.label}
              </Button>
            ))}
            {hasActiveFilter ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setSortKey("recent");
                  setPriorityFilter("all");
                  setBudgetFilter("all");
                  setDeadlineFilter("all");
                }}
              >
                필터 초기화
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">노출 {sorted.length}건</Badge>
        <Badge variant="warning">긴급 {urgentCount}건</Badge>
        <Badge variant="outline">예산 명시 {budgetDefinedCount}건</Badge>
        <Badge variant="outline">마감일 있음 {deadlineDefinedCount}건</Badge>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            조건에 맞는 열린 의뢰가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((request) => {
            const keywords = extractKeywords(request.title, request.summary);
            const budgetVisible = hasBudget(request);
            const deadlineVisible = hasDeadline(request);

            return (
              <Card key={request.request_id} className="border-border/80 transition-colors hover:border-primary/40">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{request.title}</p>
                      {request.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.summary}</p>
                      ) : null}
                    </div>
                    <Badge variant={priorityVariant(request.priority)}>{priorityLabel(request.priority)}</Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] font-medium text-muted-foreground">예산</p>
                      <p className="mt-1 text-sm font-semibold">{formatBudget(request.budget_min, request.budget_max)}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] font-medium text-muted-foreground">마감일</p>
                      <p className="mt-1 text-sm font-semibold">
                        {request.deadline_date ? formatDate(request.deadline_date) : "미정"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] font-medium text-muted-foreground">등록일</p>
                      <p className="mt-1 text-sm font-semibold">{formatDate(request.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={budgetVisible ? "success" : "outline"}>
                      {budgetVisible ? "예산 명시" : "예산 협의"}
                    </Badge>
                    <Badge variant={deadlineVisible ? "secondary" : "outline"}>
                      {deadlineVisible ? "마감일 있음" : "마감일 미정"}
                    </Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <Sparkles className="h-3 w-3" />
                      핵심 키워드
                    </span>
                    {keywords.length > 0 ? (
                      keywords.map((keyword) => (
                        <Badge key={`${request.request_id}-${keyword}`} variant="secondary">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">추출 가능한 키워드가 없습니다.</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        예산 조건 확인
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        일정 조건 확인
                      </span>
                    </div>
                    <Link href={`/bids/${request.request_id}`}>
                      <Button size="sm" className="h-8 gap-1 text-xs">
                        입찰하기 <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
