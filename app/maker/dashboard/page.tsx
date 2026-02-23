import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentUserProfile } from "@/lib/auth";
import { getMakerDashboardAction } from "@/lib/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, ShieldAlert, Briefcase, ListChecks, FolderOpen } from "lucide-react";

type OpenRequest = {
  request_id: string;
  title: string;
  summary?: string;
  budget_min?: number;
  budget_max?: number;
  deadline_date?: string;
  priority?: string;
  bid_count?: number;
};

type Bid = {
  id: string;
  request_id: string;
  price: number;
  delivery_days: number;
  status: string;
  created_at: string;
  requests: { title: string; status: string } | null;
};

type Project = {
  id: string;
  status: string;
  created_at: string;
  request_id: string;
  requests: { title: string } | null;
};

type MakerProfile = {
  is_verified: boolean;
  bio?: string;
  skills?: string[];
};

const BID_STATUS_LABELS: Record<string, string> = {
  submitted: "검토 중",
  accepted: "선택됨",
  rejected: "미선택",
  withdrawn: "철회"
};

const BID_STATUS_VARIANTS: Record<string, "default" | "success" | "secondary" | "warning" | "outline"> = {
  submitted: "warning",
  accepted: "success",
  rejected: "secondary",
  withdrawn: "outline"
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소"
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatBudget(min?: number, max?: number) {
  if (!min && !max) return "협의";
  if (min && max) return `${min.toLocaleString()}~${max.toLocaleString()}원`;
  if (min) return `${min.toLocaleString()}원~`;
  return `~${max!.toLocaleString()}원`;
}

export default async function MakerDashboardPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/auth");
  }

  if (profile.role !== "MAKER" && profile.role !== "ADMIN") {
    redirect("/dashboard" as Route);
  }

  const result = await getMakerDashboardAction();

  if (!result.ok) {
    return (
      <section>
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{result.message}</CardContent>
        </Card>
      </section>
    );
  }

  const makerProfile = result.data.makerProfile as MakerProfile | null;
  const openRequests = result.data.openRequests as OpenRequest[];
  const myBids = result.data.myBids as Bid[];
  const myProjects = result.data.myProjects as Project[];

  const isVerified = makerProfile?.is_verified ?? false;

  return (
    <section className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold">Maker 대시보드</h1>
            {isVerified ? (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                검증됨
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                미검증
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            열린 의뢰를 확인하고 입찰해보세요.
          </p>
        </div>
        <Link href={`/makers/${user.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            내 프로필 보기 <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* 미검증 경고 */}
      {!isVerified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <strong>검증 대기 중</strong>입니다. 관리자 검증이 완료되면 의뢰에 입찰할 수 있습니다.
        </div>
      )}

      {/* 열린 의뢰 목록 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">열린 의뢰</h2>
          <Badge variant="secondary">{openRequests.length}</Badge>
        </div>

        {openRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              현재 열린 의뢰가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {openRequests.map((req) => (
              <div
                key={req.request_id}
                className="rounded-xl border border-border p-4 space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{req.title}</p>
                  {req.priority && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {req.priority === "high" ? "긴급" : req.priority === "medium" ? "보통" : "여유"}
                    </Badge>
                  )}
                </div>
                {req.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{req.summary}</p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>예산: {formatBudget(req.budget_min, req.budget_max)}</span>
                    {req.deadline_date && (
                      <span>마감: {formatDate(req.deadline_date)}</span>
                    )}
                    {req.bid_count !== undefined && (
                      <span>입찰 {req.bid_count}건</span>
                    )}
                  </div>
                  {isVerified && (
                    <Link href={`/bids/${req.request_id}`}>
                      <Button size="sm" className="gap-1 text-xs h-7">
                        입찰하기 <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 내 입찰 현황 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">내 입찰 현황</h2>
            <Badge variant="secondary">{myBids.length}</Badge>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {myBids.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">아직 입찰한 의뢰가 없습니다.</p>
              ) : (
                myBids.map((bid) => (
                  <div key={bid.id} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {bid.requests?.title ?? `의뢰 ${bid.request_id.slice(0, 8)}`}
                      </p>
                      <Badge
                        variant={BID_STATUS_VARIANTS[bid.status] ?? "secondary"}
                        className="text-xs shrink-0"
                      >
                        {BID_STATUS_LABELS[bid.status] ?? bid.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{bid.price.toLocaleString()}원 · {bid.delivery_days}일</span>
                      <Link href={`/bids/${bid.request_id}`}>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          보기 <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 진행 중 프로젝트 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">진행 중 프로젝트</h2>
            <Badge variant="secondary">{myProjects.length}</Badge>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {myProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  아직 진행 중인 프로젝트가 없습니다.
                  <br />
                  입찰이 선택되면 프로젝트가 생성됩니다.
                </p>
              ) : (
                myProjects.map((proj) => (
                  <div key={proj.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {proj.requests?.title ?? `프로젝트 ${proj.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(proj.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {PROJECT_STATUS_LABELS[proj.status] ?? proj.status}
                      </Badge>
                      <Link href={`/project/${proj.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
