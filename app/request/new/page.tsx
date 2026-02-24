import { redirect } from "next/navigation";
import { RequestForm } from "@/components/forms/request-form";
import { RequestAssistantChat } from "@/components/forms/request-assistant-chat";
import { requireRole } from "@/lib/auth";

type NewRequestPageProps = {
  searchParams?: Promise<{ recommendationId?: string }>;
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  const { profile } = await requireRole(["USER", "ADMIN"]);
  if (!profile) {
    redirect("/auth");
  }

  const params = (await searchParams) ?? {};

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">나만을 위한 프로그램 만들기</h1>
        <p className="text-sm text-muted-foreground">
          몇 가지 질문에 답하면 AI가 의뢰서를 대신 작성해드려요. 기술 지식은 전혀 필요 없어요.
        </p>
      </div>
      <RequestForm recommendationId={params.recommendationId ?? null} />
      <RequestAssistantChat />
    </section>
  );
}
