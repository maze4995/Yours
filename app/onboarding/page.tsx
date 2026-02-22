import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { getCurrentUserProfile } from "@/lib/auth";
import type { ProfileInput } from "@/lib/types";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    redirect("/auth");
  }

  const initialValue: Partial<ProfileInput> | undefined = profile
    ? {
        fullName: profile.full_name ?? "",
        jobTitle: profile.job_title ?? "",
        industry: profile.industry ?? "",
        teamSize: profile.team_size ?? 1,
        painPoints: profile.pain_points ?? [],
        goals: profile.goals ?? [],
        currentTools: profile.current_tools ?? [],
        budgetPreference: profile.budget_preference ?? "",
        deadlinePreference: profile.deadline_preference ?? ""
      }
    : undefined;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">사용자 프로파일링</h1>
      <p className="text-sm text-muted-foreground">
        입력한 정보는 추천 품질과 맞춤 개발 요청 정확도를 높이는 데 사용됩니다.
      </p>
      <OnboardingForm initialValue={initialValue} />
    </section>
  );
}
