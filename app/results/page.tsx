import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecommendationItem } from "@/lib/types";

export default async function ResultsPage() {
  const { supabase, user } = await requireAuth();

  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recommendation) {
    redirect("/onboarding");
  }

  const items = (recommendation.items ?? []) as RecommendationItem[];

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="text-3xl font-bold">추천 결과</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          현재 프로필 기준으로 최대 3개의 기존 소프트웨어를 추천했습니다.
        </p>
        <div className="mt-3">
          <Badge variant={recommendation.fit_decision === "software_fit" ? "success" : "warning"}>
            {recommendation.fit_decision === "software_fit"
              ? "기존 소프트웨어 도입 가능"
              : "맞춤 개발 권장"}
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">{recommendation.fit_reason}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.softwareId}>
            <CardHeader>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>{item.whyRecommended}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">핵심 기능</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {item.keyFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">장점</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {item.pros.map((pro) => (
                    <li key={pro}>{pro}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">주의점</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {item.cautions.map((caution) => (
                    <li key={caution}>{caution}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4" />
            기존 도구로 요구사항을 충분히 해결하기 어렵다면 맞춤 개발 요청을 생성해 검증된 Maker 입찰을 받을 수
            있습니다.
          </div>
          <Link href={`/request/new?recommendationId=${recommendation.id}`}>
            <Button className="gap-2">
              맞춤 개발 요청 생성 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
