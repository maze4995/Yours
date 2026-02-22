import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statusLabel: Record<string, string> = {
  draft: "초안",
  open: "입찰 진행 중",
  selected: "개발자 선정 완료",
  canceled: "취소됨"
};

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireAuth();

  const { data: request } = await supabase.from("requests").select("*").eq("id", id).maybeSingle();
  if (!request) {
    notFound();
  }

  const isOwner = request.user_id === user.id;
  if (!isOwner) {
    notFound();
  }

  const { data: project } = await supabase.from("projects").select("id").eq("request_id", id).maybeSingle();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{request.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{request.summary}</p>
        </div>
        <Badge variant={request.status === "selected" ? "success" : "secondary"}>
          {statusLabel[request.status] ?? request.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>요청 상세</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{request.requirements}</p>
          <p className="text-muted-foreground">
            예산: {request.budget_min ?? "-"} ~ {request.budget_max ?? "-"}
          </p>
          <p className="text-muted-foreground">
            우선순위: {request.priority} / 마감: {request.deadline_date ?? "-"}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/bids/${request.id}`}>
          <Button>입찰 보기</Button>
        </Link>
        {project ? (
          <Link href={`/project/${project.id}`}>
            <Button variant="outline">프로젝트 보기</Button>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
