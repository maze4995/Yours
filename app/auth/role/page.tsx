import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { SocialRoleForm } from "@/components/forms/social-role-form";

export default async function AuthRolePage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect("/auth");
  }

  if (profile?.onboarding_completed) {
    if (profile.role === "MAKER") {
      redirect("/maker/dashboard");
    }
    redirect("/results");
  }

  if (profile?.role === "MAKER") {
    redirect("/maker/onboarding");
  }

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">가입 유형 선택</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          소셜 로그인으로 처음 접속하셨습니다. 진행할 역할을 먼저 선택해 주세요.
        </p>
      </div>
      <SocialRoleForm />
    </section>
  );
}
