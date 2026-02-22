import Link from "next/link";
import { getSettingsSummaryAction } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAuth();
  const result = await getSettingsSummaryAction();

  if (!result.ok) {
    return (
      <section>
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{result.message}</CardContent>
        </Card>
      </section>
    );
  }

  const account = result.data.account as {
    full_name?: string;
    role?: string;
    job_title?: string;
    onboarding_completed?: boolean;
  } | null;
  const myRequests = result.data.myRequests as Array<{ id: string; title: string; status: string }>;
  const myProjects = result.data.myProjects as Array<{ id: string; status: string }>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">계정, 요청, 프로젝트를 한 화면에서 확인합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>이름: {account?.full_name ?? "-"}</p>
          <p>역할: {account?.role ?? "-"}</p>
          <p>직무: {account?.job_title ?? "-"}</p>
          <p>
            온보딩:{" "}
            <Badge variant={account?.onboarding_completed ? "success" : "warning"}>
              {account?.onboarding_completed ? "완료" : "미완료"}
            </Badge>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>내 요청</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {myRequests.length === 0 ? (
              <p className="text-muted-foreground">요청이 없습니다.</p>
            ) : (
              myRequests.map((request) => (
                <div key={request.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">{request.title}</p>
                  <p className="text-muted-foreground">상태: {request.status}</p>
                  <Link href={`/request/${request.id}`} className="text-primary underline">
                    상세 보기
                  </Link>
                </div>
              ))
            )}
            <Link href="/request/new">
              <Button variant="outline">새 요청 만들기</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내 프로젝트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {myProjects.length === 0 ? (
              <p className="text-muted-foreground">프로젝트가 없습니다.</p>
            ) : (
              myProjects.map((project) => (
                <div key={project.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">프로젝트 {project.id.slice(0, 8)}</p>
                  <p className="text-muted-foreground">상태: {project.status}</p>
                  <Link href={`/project/${project.id}`} className="text-primary underline">
                    상태 보기
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
