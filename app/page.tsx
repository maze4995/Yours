import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Sparkles,
    title: "개인 맞춤 소프트웨어 추천",
    description: "온보딩 프로필을 기반으로 내부 카탈로그에서 가장 적합한 툴만 선별합니다."
  },
  {
    icon: ShieldCheck,
    title: "검증된 개발자 역경매",
    description: "적절한 툴이 없으면 검증된 Maker가 가격·납기·접근방식으로 입찰합니다."
  },
  {
    icon: CheckCircle2,
    title: "선택 후 프로젝트 추적",
    description: "입찰 선택과 동시에 프로젝트를 생성하고 상태 이력을 간단히 추적합니다."
  }
];

export default function HomePage() {
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
