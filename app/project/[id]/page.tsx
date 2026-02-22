import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusForm } from "@/components/forms/project-status-form";
import { requireAuth } from "@/lib/auth";
import type { ProjectStatus } from "@/lib/types";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

const statusLabel: Record<ProjectStatus, string> = {
  active: "진행 중",
  delivered: "납품 완료",
  accepted: "검수 승인",
  closed: "종료"
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const { supabase } = await requireAuth();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "*, requests:request_id (title, summary), bids:accepted_bid_id (price, delivery_days, approach_summary, maintenance_option)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: events } = await supabase
    .from("project_events")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.requests?.title ?? "프로젝트"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{project.requests?.summary}</p>
        </div>
        <Badge variant="secondary">{statusLabel[project.status as ProjectStatus]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>계약 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>선택 입찰 금액: {project.bids?.price ?? "-"}</p>
          <p>납기: {project.bids?.delivery_days ?? "-"}일</p>
          <p>접근 방식: {project.bids?.approach_summary ?? "-"}</p>
          <p>유지관리: {project.bids?.maintenance_option ?? "-"}</p>
          <p className="rounded-md bg-muted p-2 text-muted-foreground">{project.payment_placeholder}</p>
        </CardContent>
      </Card>

      <ProjectStatusForm projectId={id} currentStatus={project.status as ProjectStatus} />

      <Card>
        <CardHeader>
          <CardTitle>타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {(events ?? []).map((event) => (
              <li key={event.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{event.event_type}</p>
                <p className="text-muted-foreground">{event.event_note ?? "메모 없음"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString("ko-KR")}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
