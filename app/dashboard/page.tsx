import Link from "next/link";
import { ArrowRight, FileText, FolderOpen, Plus, Sparkles } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getDashboardDataAction } from "@/lib/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteRequestButton } from "@/components/dashboard/delete-request-button";
import { AnalysisCard, type AnalysisCardData } from "@/components/dashboard/analysis-card";

type DashboardRequest = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type DashboardProject = {
  id: string;
  status: string;
  created_at: string;
  request_id: string;
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  open: "진행 중",
  selected: "선정 완료",
  canceled: "취소됨"
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

function normalizeRecommendations(raw: unknown[]): AnalysisCardData[] {
  return raw.map((row) => {
    const rec = row as Record<string, unknown>;
    const rawItems = Array.isArray(rec.items)
      ? (rec.items as { name?: string; score?: number; solvable?: boolean }[])
      : [];
    return {
      id: String(rec.id ?? ""),
      fit_decision: (rec.fit_decision as "software_fit" | "custom_build") ?? "software_fit",
      fit_reason: (rec.fit_reason as string | null) ?? null,
      created_at: String(rec.created_at ?? new Date().toISOString()),
      updated_at: String(rec.updated_at ?? rec.created_at ?? new Date().toISOString()),
      profile_snapshot: (rec.profile_snapshot as Record<string, unknown> | null) ?? null,
      items: rawItems
    };
  });
}

export default async function DashboardPage() {
  await requireAuth();
  const result = await getDashboardDataAction();

  if (!result.ok) {
    return (
      <section>
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{result.message}</CardContent>
        </Card>
      </section>
    );
  }

  const account = result.data.account as { full_name?: string; role?: string } | null;
  const recommendations = normalizeRecommendations(result.data.recommendations);
  const myRequests = result.data.myRequests as DashboardRequest[];
  const myProjects = result.data.myProjects as DashboardProject[];

  return (
    <section className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {account?.full_name ? `${account.full_name}님의 대시보드` : "대시보드"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 분석 이력, 요청서, 프로젝트를 한 곳에서 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/onboarding">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              새 프로파일링
            </Button>
          </Link>
          <Link href="/request/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              새 요청서
            </Button>
          </Link>
        </div>
      </div>

      {/* AI 분석 이력 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI 분석 이력</h2>
          <Badge variant="secondary">{recommendations.length}</Badge>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                아직 생성된 분석 이력이 없습니다.
              </p>
              <Link href="/onboarding">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  첫 프로파일링 시작하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <AnalysisCard key={rec.id} data={rec} isLatest={idx === 0} />
            ))}
          </div>
        )}
      </div>

      {/* 요청서 + 프로젝트 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 내 요청서 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">내 요청서</h2>
            <Badge variant="secondary">{myRequests.length}</Badge>
          </div>
          <Card>
            <CardContent className="space-y-3 p-4">
              {myRequests.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">요청서가 없습니다.</p>
              ) : (
                myRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{request.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                      </Badge>
                      <DeleteRequestButton requestId={request.id} requestTitle={request.title} />
                      <Link href={`/request/${request.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2" aria-label="요청 상세 보기">
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

        {/* 내 프로젝트 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">내 프로젝트</h2>
            <Badge variant="secondary">{myProjects.length}</Badge>
          </div>
          <Card>
            <CardContent className="space-y-3 p-4">
              {myProjects.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">진행 중인 프로젝트가 없습니다.</p>
              ) : (
                myProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">프로젝트 {project.id.slice(0, 8)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(project.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                      </Badge>
                      <Link href={`/project/${project.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2" aria-label="프로젝트 보기">
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
