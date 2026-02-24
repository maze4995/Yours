import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { ArrowRight, FolderOpen, ListChecks, ShieldAlert, ShieldCheck } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth";
import { getMakerDashboardAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

type DeveloperProfile = {
  is_verified: boolean;
};

const BID_STATUS_LABELS: Record<string, string> = {
  submitted: "검토 중",
  accepted: "선정됨",
  rejected: "미선정",
  withdrawn: "철회"
};

const BID_STATUS_VARIANTS: Record<string, "default" | "success" | "secondary" | "warning" | "outline"> = {
  submitted: "warning",
  accepted: "success",
  rejected: "secondary",
  withdrawn: "outline"
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  delivered: "납품 완료",
  accepted: "검수 승인",
  closed: "종료"
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default async function DeveloperDashboardPage() {
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

  const developerProfile = result.data.makerProfile as DeveloperProfile | null;
  const myBids = result.data.myBids as Bid[];
  const myProjects = result.data.myProjects as Project[];

  const isVerified = developerProfile?.is_verified ?? false;
  const profileHref = developerProfile ? `/makers/${user.id}` : "/maker/onboarding";
  const profileButtonLabel = developerProfile ? "내 프로필 보기" : "내 프로필 설정";

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-3xl font-bold">개발자 대시보드</h1>
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
            열린 의뢰는 전용 게시판에서 확인하고, 여기서는 내 입찰/프로젝트를 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/maker/requests">
            <Button variant="default" size="sm" className="gap-2">
              의뢰 게시판 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={profileHref}>
            <Button variant="outline" size="sm" className="gap-2">
              {profileButtonLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {!isVerified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>검증 대기 중</strong>입니다. 관리자 검증 완료 후 의뢰 게시판에서 입찰할 수 있습니다.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">내 입찰 현황</h2>
            <Badge variant="secondary">{myBids.length}</Badge>
          </div>
          <Card>
            <CardContent className="space-y-3 p-4">
              {myBids.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">아직 입찰한 의뢰가 없습니다.</p>
              ) : (
                myBids.map((bid) => (
                  <div key={bid.id} className="space-y-1.5 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {bid.requests?.title ?? `의뢰 ${bid.request_id.slice(0, 8)}`}
                      </p>
                      <Badge variant={BID_STATUS_VARIANTS[bid.status] ?? "secondary"} className="text-xs">
                        {BID_STATUS_LABELS[bid.status] ?? bid.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {bid.price.toLocaleString()}원 · {bid.delivery_days}일
                      </span>
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

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">진행 중 프로젝트</h2>
            <Badge variant="secondary">{myProjects.length}</Badge>
          </div>
          <Card>
            <CardContent className="space-y-3 p-4">
              {myProjects.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  아직 진행 중인 프로젝트가 없습니다.
                  <br />
                  입찰이 선택되면 프로젝트가 생성됩니다.
                </p>
              ) : (
                myProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {project.requests?.title ?? `프로젝트 ${project.id.slice(0, 8)}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(project.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                      </Badge>
                      <Link href={`/project/${project.id}`}>
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
