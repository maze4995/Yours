import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function AuthPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (user) {
    redirect(profile?.onboarding_completed ? "/results" : "/onboarding");
  }

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Yours 시작하기</h1>
        <p className="mt-2 text-sm text-muted-foreground">가입 후 바로 개인 프로파일링과 추천을 진행합니다.</p>
      </div>
      <AuthForm />
    </section>
  );
}
