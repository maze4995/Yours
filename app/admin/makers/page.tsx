import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { MakerVerifyButton } from "@/components/dashboard/maker-verify-button";

type DeveloperProfileRow = {
  user_id: string;
  display_name: string;
  headline: string | null;
  skills: string[] | null;
  portfolio_links: string[] | null;
  is_verified: boolean;
  verification_badge: string | null;
  completed_projects_count: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default async function AdminDevelopersPage() {
  const { supabase } = await requireRole(["ADMIN"]);

  const { data: developers, error } = await supabase
    .from("maker_profiles")
    .select(
      "user_id, display_name, headline, skills, portfolio_links, is_verified, verification_badge, completed_projects_count, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <section>
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      </section>
    );
  }

  const rows = (developers ?? []) as DeveloperProfileRow[];
  const ids = rows.map((row) => row.user_id);
  const { data: profiles } = ids.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">개발자 검증 관리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          관리자 전용 페이지입니다. 개발자 계정의 검증 상태를 승인/해제할 수 있습니다.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">등록된 개발자 프로필이 없습니다.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((developer) => {
            const owner = profileMap.get(developer.user_id);
            const skills = developer.skills ?? [];
            const portfolioCount = developer.portfolio_links?.length ?? 0;
            return (
              <Card key={developer.user_id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{developer.display_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{developer.headline || "소개 문구 없음"}</p>
                      <p className="text-xs text-muted-foreground">
                        계정: {owner?.full_name ?? "-"} · uid: {developer.user_id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={developer.is_verified ? "success" : "warning"}>
                        {developer.is_verified ? developer.verification_badge || "검증 완료" : "미검증"}
                      </Badge>
                      <MakerVerifyButton makerUserId={developer.user_id} isVerified={developer.is_verified} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length > 0 ? (
                      skills.slice(0, 8).map((skill) => (
                        <Badge key={`${developer.user_id}-${skill}`} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">등록된 스킬 없음</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    포트폴리오 {portfolioCount}개 · 완료 프로젝트 {developer.completed_projects_count ?? 0}개 · 등록일 {formatDate(developer.created_at)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
