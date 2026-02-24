import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { getCurrentUserProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(url && anon && !url.includes("your-") && !anon.includes("your-"));
}

export default async function AuthPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (user) {
    if (profile?.role === "MAKER") {
      redirect("/maker/dashboard");
    }
    redirect(profile?.onboarding_completed ? "/results" : "/onboarding");
  }

  const configured = isSupabaseConfigured();

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Yours 시작하기</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          가입 후 바로 개인 프로파일링과 추천을 진행합니다.
        </p>
      </div>

      {!configured ? (
        <Card className="mx-auto w-full max-w-md border-destructive/40">
          <CardContent className="space-y-2 py-4 text-sm">
            <p className="font-semibold text-destructive">Supabase 환경변수가 설정되지 않았습니다.</p>
            <p className="text-muted-foreground">
              프로젝트 루트에 <code>.env.local</code> 파일을 만들고 아래 값을 설정해 주세요.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <code>NEXT_PUBLIC_SUPABASE_URL</code>
              </li>
              <li>
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              </li>
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <AuthForm />
    </section>
  );
}
