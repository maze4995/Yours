import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CheckCircle2, LayoutDashboard, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserProfile } from "@/lib/auth";

const features = [
  {
    icon: Sparkles,
    title: "개인 맞춤 소프트웨어 추천",
    description: "온보딩 프로필을 기반으로 내부 카탈로그에서 가장 적합한 툴만 선별합니다."
  },
  {
    icon: ShieldCheck,
    title: "검증된 개발자 매칭",
    description: "적절한 툴이 없으면 검증된 Maker가 가격·납기·접근방식으로 입찰합니다."
  },
  {
    icon: CheckCircle2,
    title: "선택 후 프로젝트 추적",
    description: "입찰 선택과 동시에 프로젝트를 생성하고 상태 이력을 간단히 추적합니다."
  }
];

export default async function HomePage() {
  const { user, profile } = await getCurrentUserProfile();

  // 로그인 + 온보딩 완료 유저 → 개인화된 환영 화면
  if (user && profile?.onboarding_completed) {
    const isMaker = profile.role === "MAKER";

    return (
      <section className="space-y-8">
        <div className="glass-panel animate-fade-in-up rounded-2xl p-10">
          <p className="mb-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            돌아오셨군요 👋
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            {profile.full_name ? `${profile.full_name}님,` : ""}
            <br />
            {isMaker ? "오늘도 좋은 프로젝트 찾아보세요." : "다음 단계로 바로 이동하세요."}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            {isMaker
              ? "열린 의뢰를 확인하고 입찰해보세요. 새로운 프로젝트가 기다리고 있습니다."
              : "소프트웨어 추천 결과를 확인하거나, 새 프로파일링으로 더 나은 추천을 받아보세요."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {isMaker ? (
              <>
                <Link href={"/maker/dashboard" as Route}>
                  <Button size="lg" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Maker 대시보드
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button size="lg" variant="outline">
                    내 정보
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/results">
                  <Button size="lg" className="gap-2">
                    추천 결과 보기 <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={"/dashboard" as Route}>
                  <Button size="lg" variant="outline" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    대시보드
                  </Button>
                </Link>
                <Link href="/onboarding">
                  <Button size="lg" variant="ghost" className="gap-2">
                    <Plus className="h-4 w-4" />
                    새 프로파일링
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 빠른 접근 카드 */}
        {!isMaker && (
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/results">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI 추천 결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">최근 프로파일링 분석과 추천 소프트웨어를 확인합니다.</p>
                </CardContent>
              </Card>
            </Link>
            <Link href={"/dashboard" as Route}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    내 대시보드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">모든 프로파일링 이력, 의뢰서, 프로젝트를 관리합니다.</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/request/new">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Plus className="h-4 w-4 text-primary" />
                    의뢰서 작성
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">AI가 의뢰서를 대신 작성해드려요. 기술 지식 불필요.</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>
    );
  }

  // 비로그인 / 온보딩 미완료 → 마케팅 Hero
  return (
    <section className="space-y-10">
      <div className="glass-panel animate-fade-in-up rounded-2xl p-10">
        <p className="mb-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Minimal SaaS Prototype
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          기존 소프트웨어 추천부터
          <br />
          맞춤 개발자 매칭까지 한 번에
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Yours는 사용자 상황을 빠르게 프로파일링하고, 기존 도구로 해결 가능한지 먼저 검증한 뒤 필요하면
          검증된 개발자 입찰로 연결하는 실전형 프로토타입입니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/auth">
            <Button size="lg" className="gap-2">
              바로 시작하기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth">
            <Button size="lg" variant="outline">
              로그인 / 가입
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <feature.icon className="h-5 w-5 text-primary" />
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
