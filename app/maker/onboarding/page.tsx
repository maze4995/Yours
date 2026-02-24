import { redirect } from "next/navigation";
import type { Route } from "next";
import { Code2 } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth";
import { MakerOnboardingForm } from "@/components/forms/maker-onboarding-form";

export default async function MakerOnboardingPage() {
  const { user, profile, supabase } = await getCurrentUserProfile();

  if (!user) {
    redirect("/auth");
  }

  const { data: makerProfile } = await supabase
    .from("maker_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // 개발자 프로필이 이미 생성된 경우에는 대시보드로 보냅니다.
  if (profile?.role === "MAKER" && makerProfile) {
    redirect("/maker/dashboard" as Route);
  }

  return (
    <section className="space-y-6">
      <div className="text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Code2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">개발자 프로필 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          의뢰 수주를 위한 프로필을 작성해 주세요.
          <br />
          관리자 검증이 완료되면 의뢰에 입찰할 수 있습니다.
        </p>
      </div>

      <MakerOnboardingForm />
    </section>
  );
}
