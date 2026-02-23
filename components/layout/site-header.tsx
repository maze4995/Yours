import Link from "next/link";
import type { Route } from "next";
import { getCurrentUserProfile } from "@/lib/auth";
import { signOutAndRedirectAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const userLinks: Array<{ href: Route; label: string }> = [
  { href: "/onboarding", label: "프로파일링" },
  { href: "/results", label: "추천 결과" },
  { href: "/dashboard" as Route, label: "대시보드" }
];

const makerLinks: Array<{ href: Route; label: string }> = [
  { href: "/maker/dashboard" as Route, label: "Maker 대시보드" },
  { href: "/settings", label: "내 정보" }
];

export async function SiteHeader() {
  const { user, profile } = await getCurrentUserProfile();

  const isMaker = profile?.role === "MAKER";
  const authedLinks = isMaker ? makerLinks : userLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Yours
          </Link>
          {user ? (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {profile?.role ?? "USER"}
            </Badge>
          ) : null}
        </div>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {authedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <form action={signOutAndRedirectAction}>
                <Button variant="outline" size="sm" type="submit">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm">로그인</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
