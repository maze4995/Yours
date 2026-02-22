import { redirect } from "next/navigation";
import { RequestForm } from "@/components/forms/request-form";
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
      <h1 className="text-3xl font-bold">맞춤 개발 요청</h1>
      <p className="text-sm text-muted-foreground">
        요청이 `open` 상태가 되면 검증된 Maker가 입찰하고, 선택 시 프로젝트가 자동 생성됩니다.
      </p>
      <RequestForm recommendationId={params.recommendationId ?? null} />
    </section>
  );
}
