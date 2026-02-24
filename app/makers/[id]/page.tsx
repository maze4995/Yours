import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

type MakerProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function MakerProfilePage({ params }: MakerProfilePageProps) {
  const { id } = await params;
  const { supabase, user } = await requireAuth();
  const { data: maker } = await supabase
    .from("maker_profiles")
    .select(
      "user_id, display_name, headline, bio, skills, portfolio_links, is_verified, verification_badge, rating, completed_projects_count"
    )
    .eq("user_id", id)
    .maybeSingle();

  if (!maker) {
    if (user.id === id) {
      redirect("/maker/onboarding");
    }
    notFound();
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-3xl">{maker.display_name}</CardTitle>
            {maker.is_verified ? <Badge variant="success">{maker.verification_badge}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{maker.headline}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{maker.bio || "소개가 아직 등록되지 않았습니다."}</p>
          <div className="flex flex-wrap gap-2">
            {(maker.skills ?? []).map((skill: string) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
          <div className="space-y-2">
            <p className="font-medium">포트폴리오</p>
            <ul className="list-disc space-y-1 pl-5">
              {(maker.portfolio_links ?? []).slice(0, 3).map((link: string) => (
                <li key={link}>
                  <a href={link} target="_blank" rel="noreferrer" className="text-primary underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground">
            평점: {maker.rating ?? "초기값 없음"} / 완료 프로젝트: {maker.completed_projects_count}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
