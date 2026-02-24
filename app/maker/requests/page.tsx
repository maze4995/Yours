import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RequestsBoard, type OpenRequest } from "@/components/maker/requests-board";

export default async function DeveloperRequestsPage() {
  const { user, profile, supabase } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/auth");
  }

  if (profile.role !== "MAKER" && profile.role !== "ADMIN") {
    redirect("/dashboard" as Route);
  }

  const { data: developerProfile } = await supabase
    .from("maker_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  const canViewBoard = profile.role === "ADMIN" || developerProfile?.is_verified === true;

  const { data: openRequests, error } = canViewBoard
    ? await supabase.rpc("rpc_list_open_requests", {
        limit_count: 10,
        offset_count: 0
      })
    : { data: [] as OpenRequest[], error: null };

  if (error) {
    return (
      <section>
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      </section>
    );
  }

  const rows = (openRequests ?? []) as OpenRequest[];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">개발자 의뢰 게시판</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            정렬과 필터를 바꿔도 페이지 이동 없이 바로 반영됩니다.
          </p>
        </div>
        <Link href="/maker/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            개발자 대시보드 <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {!canViewBoard ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            검증 대기 중
          </div>
          <p className="mt-1">관리자 검증이 완료되면 의뢰 게시판 조회와 입찰이 가능합니다.</p>
        </div>
      ) : (
        <RequestsBoard rows={rows} />
      )}
    </section>
  );
}
