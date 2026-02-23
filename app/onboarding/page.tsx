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
    <section className="space-y-8 py-4">
      <OnboardingForm initialValue={initialValue} />
    </section>
  );
}
