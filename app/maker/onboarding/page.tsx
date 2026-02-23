import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentUserProfile } from "@/lib/auth";
import { MakerOnboardingForm } from "@/components/forms/maker-onboarding-form";
import { Code2 } from "lucide-react";

export default async function MakerOnboardingPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect("/auth");
  }

  // 이미 Maker 프로필이 완성된 경우 대시보드로
  if (profile?.role === "MAKER") {
    redirect("/maker/dashboard" as Route);
  }

  return (
    <section className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Code2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Maker 프로필 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          의뢰 수주를 위한 프로필을 작성해 주세요.
          <br />
          관리자 검증 후 의뢰에 입찰할 수 있습니다.
        </p>
      </div>

      <MakerOnboardingForm />
    </section>
  );
}
