import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  LayoutDashboard,
  Plus,
  Sparkles,
  User,
  Zap,
  Search,
  FileText,
  ShieldCheck,
  TrendingUp,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mockup } from "@/components/ui/mockup";
import { Glow } from "@/components/ui/glow";
import { cn } from "@/lib/utils";
import { getCurrentUserProfile } from "@/lib/auth";

// ── 서비스 통계 ──────────────────────────────────────────────
const stats = [
  { value: "3분", label: "평균 프로파일링 시간" },
  { value: "34개+", label: "국내외 소프트웨어 카탈로그" },
  { value: "AI 분석", label: "맞춤형 불편사항 리포트" },
  { value: "무료", label: "소프트웨어 추천 서비스" },
];

// ── 이용 단계 ──────────────────────────────────────────────
const steps = [
  {
    step: "01",
    icon: User,
    title: "5분 프로파일링",
    desc: "직무·업종·팀 규모·불편사항을 입력합니다. 기술 지식은 전혀 필요 없어요.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "AI 소프트웨어 추천",
    desc: "AI가 34개+ 국내외 카탈로그에서 내 상황에 딱 맞는 툴 TOP 3를 선별합니다.",
  },
  {
    step: "03",
    icon: Code2,
    title: "맞춤 개발 매칭 (필요 시)",
    desc: "기존 툴이 부족하면 검증된 개발자(Maker)가 가격·납기·접근방식을 직접 제안합니다.",
  },
];

// ── 주요 기능 카드 ──────────────────────────────────────────
const features = [
  {
    icon: Search,
    title: "현황 진단 + 툴 추천",
    description:
      "내가 겪는 불편함과 목표를 AI가 분석해, 시중 소프트웨어로 해결 가능한지 먼저 판단합니다. 카카오워크·채널톡·핵클 등 한국 서비스도 포함.",
    badge: "무료",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: FileText,
    title: "AI 의뢰서 자동 작성",
    description:
      "기존 툴이 맞지 않으면 AI가 내 상황을 정리해 개발 의뢰서를 대신 써줍니다. 기술 용어 몰라도 OK.",
    badge: "AI 지원",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    icon: ShieldCheck,
    title: "검증 Maker 역경매",
    description:
      "의뢰서가 공개되면 검증된 개발자들이 가격·납기를 제안합니다. 비교 후 직접 선택하면 프로젝트가 시작됩니다.",
    badge: "역경매",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    icon: TrendingUp,
    title: "프로젝트 이력 관리",
    description:
      "프로파일링 분석 이력, 의뢰서, 프로젝트 진행 상황을 대시보드에서 한 번에 확인합니다.",
    badge: "대시보드",
    badgeColor: "bg-muted text-muted-foreground",
  },
];

// ── 대상 사용자 ──────────────────────────────────────────────
const useCases = [
  {
    emoji: "🏢",
    title: "스타트업 창업자",
    desc: "도구 선택에 쏟는 시간을 줄이고 빠르게 검증된 툴로 시작하거나, 나만의 MVP를 만들 수 있어요.",
  },
  {
    emoji: "📊",
    title: "비개발 직군 팀장",
    desc: "기술 용어 없이 업무 불편함만 설명하면, AI가 맞는 솔루션을 찾아드립니다.",
  },
  {
    emoji: "💼",
    title: "운영·마케팅 담당자",
    desc: "반복 업무 자동화, 고객 관리, 분석 툴 중 내 상황에 맞는 것만 골라 추천받을 수 있어요.",
  },
];

// ── 앱 미리보기 (Mockup 내부) ────────────────────────────────
const previewRecs = [
  {
    initial: "N",
    name: "Notion",
    tag: "문서·협업",
    score: 94,
    bg: "bg-gray-900",
    text: "text-white",
  },
  {
    initial: "A",
    name: "Airtable",
    tag: "데이터·관리",
    score: 87,
    bg: "bg-amber-500",
    text: "text-white",
  },
  {
    initial: "S",
    name: "Slack",
    tag: "팀 커뮤니케이션",
    score: 79,
    bg: "bg-purple-600",
    text: "text-white",
  },
];

function AppPreview() {
  return (
    <div className="bg-background p-5 space-y-4">
      {/* 분석 완료 헤더 */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">AI 분석 완료</p>
          <p className="text-xs text-muted-foreground">마케터 · 이커머스 · 5인 팀</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          software_fit
        </span>
      </div>

      {/* 추천 카드 리스트 */}
      <div className="space-y-2.5">
        {previewRecs.map((rec, i) => (
          <div
            key={rec.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold",
                  rec.bg,
                  rec.text,
                )}
              >
                {rec.initial}
              </div>
              {i === 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400">
                  <Star className="h-2.5 w-2.5 fill-white text-white" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{rec.name}</span>
                <span className="text-xs font-bold text-primary">{rec.score}점</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${rec.score}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{rec.tag}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { user, profile } = await getCurrentUserProfile();

  // ── 로그인 + 온보딩 완료 유저 → 개인화 화면 ──
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
                  <Button size="lg" variant="outline">내 정보</Button>
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

  // ── 비로그인 / 온보딩 미완료 → 마케팅 Hero ──
  return (
    <div className="space-y-0">

      {/* ① Hero 메인 섹션 */}
      <section className="relative overflow-hidden bg-background px-4 py-16 text-foreground md:py-28 lg:py-36">
        <div className="relative mx-auto max-w-[1280px]">
          <div className="relative z-10 flex flex-col items-center gap-6 text-center lg:gap-10">

            {/* 배지 */}
            <div className="animate-appear opacity-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5" />
                AI 소프트웨어 추천 + 개발자 역경매 플랫폼
              </span>
            </div>

            {/* 헤드라인 — 그라디언트 텍스트 */}
            <h1
              className={cn(
                "inline-block animate-appear pb-2",
                "bg-gradient-to-b from-foreground via-foreground/90 to-muted-foreground",
                "bg-clip-text text-transparent",
                "text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl",
                "leading-[1.1] sm:leading-[1.1]",
              )}
            >
              내 업무에 딱 맞는 툴,
              <br />
              AI가 5분 만에 찾아드려요
            </h1>

            {/* 설명 */}
            <p
              className={cn(
                "max-w-[560px] animate-appear opacity-0 [animation-delay:150ms]",
                "text-base font-medium text-muted-foreground sm:text-lg md:text-xl",
              )}
            >
              프로파일링만 하면 AI가 최적의 소프트웨어를 선별합니다.
              시중 툴로 해결이 안 되면 검증된 개발자가 직접 가격을 제안합니다.
            </p>

            {/* CTA 버튼 */}
            <div className="animate-appear opacity-0 [animation-delay:300ms] flex flex-wrap justify-center gap-4">
              <Link href="/auth">
                <Button
                  size="lg"
                  className="gap-2 px-8 text-base shadow-lg transition-all duration-300"
                >
                  무료로 시작하기 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button
                  size="lg"
                  variant="ghost"
                  className="px-8 text-base text-foreground/70 transition-all duration-300"
                >
                  로그인
                </Button>
              </Link>
            </div>
            <p className="animate-appear opacity-0 [animation-delay:400ms] -mt-2 text-xs text-muted-foreground">
              신용카드 불필요 · 소프트웨어 추천은 무료
            </p>

            {/* Mockup — 앱 미리보기 */}
            <div className="animate-appear opacity-0 [animation-delay:700ms] w-full max-w-lg pt-6 sm:max-w-xl md:max-w-2xl">
              <Mockup
                className={cn(
                  "shadow-[0_0_60px_-12px_rgba(0,0,0,0.25)]",
                  "border-primary/10",
                )}
              >
                <AppPreview />
              </Mockup>
            </div>
          </div>
        </div>

        {/* 배경 Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Glow
            variant="above"
            className="animate-appear-zoom opacity-0 [animation-delay:1000ms]"
          />
        </div>
      </section>

      {/* ② 통계 바 */}
      <section className="border-y border-border bg-muted/30 px-4 py-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold text-primary md:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 이용 단계 */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-[1280px] space-y-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">이렇게 사용해요</h2>
            <p className="mt-2 text-sm text-muted-foreground">단 3단계로 내 업무 문제를 해결합니다</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/30"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-5xl font-black text-primary/10">{s.step}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ④ 주요 기능 */}
      <section className="bg-muted/20 px-4 py-20">
        <div className="mx-auto max-w-[1280px] space-y-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Yours가 제공하는 것</h2>
            <p className="mt-2 text-sm text-muted-foreground">소프트웨어 선택부터 개발 완료까지 하나의 플로우</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="space-y-3 rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ 대상 사용자 */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-[1280px] space-y-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">이런 분들에게 딱 맞아요</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {useCases.map((u) => (
              <div
                key={u.title}
                className="space-y-3 rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/30"
              >
                <span className="text-3xl">{u.emoji}</span>
                <h3 className="font-bold">{u.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ Maker 모집 배너 */}
      <section className="bg-muted/20 px-4 py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-8 py-12 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Code2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold md:text-2xl">개발자(Maker)로 참여하세요</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              검증된 개발자로 등록하면 맞춤 개발 의뢰에 입찰할 수 있습니다.
              가격·납기·접근방식을 직접 제안하고 프로젝트를 수주해 보세요.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: CheckCircle2, text: "검증 후 입찰 가능" },
                { icon: CheckCircle2, text: "역경매로 공정한 경쟁" },
                { icon: CheckCircle2, text: "프로젝트 이력 관리" },
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  {item.text}
                </span>
              ))}
            </div>
            <Link href="/auth" className="mt-6 inline-block">
              <Button variant="outline" size="lg" className="gap-2">
                <Code2 className="h-4 w-4" />
                Maker로 가입하기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ⑦ 최종 CTA */}
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Glow variant="center" className="opacity-20" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1280px] text-center space-y-5">
          <h2 className="text-2xl font-extrabold md:text-4xl">
            지금 바로 내 업무 솔루션을 찾아보세요
          </h2>
          <p className="mx-auto max-w-md text-sm opacity-80 md:text-base">
            5분 프로파일링으로 AI 추천을 받고, 필요하면 개발자에게 연결됩니다.
            소프트웨어 추천은 완전 무료입니다.
          </p>
          <Link href="/auth">
            <Button size="lg" variant="secondary" className="mt-2 gap-2 px-10 text-base shadow-lg">
              무료로 시작하기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
