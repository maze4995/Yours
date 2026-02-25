import { NextResponse } from "next/server";

export const maxDuration = 300;
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { runRecommendationFlow } from "@/lib/recommendation/service";
import type { ProfileInput } from "@/lib/types";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) {
    return NextResponse.json({ code: "NOT_FOUND", message: "프로필이 없습니다." }, { status: 404 });
  }

  if (!["USER", "ADMIN"].includes(profile.role)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "일반 사용자 계정만 추천을 재생성할 수 있습니다." },
      { status: 403 }
    );
  }

  const profileInput: ProfileInput = {
    fullName: profile.full_name ?? "",
    jobTitle: profile.job_title ?? "",
    industry: profile.industry ?? "",
    teamSize: profile.team_size ?? 1,
    painPoints: profile.pain_points ?? [],
    goals: profile.goals ?? [],
    currentTools: profile.current_tools ?? [],
    budgetPreference: profile.budget_preference ?? "",
    deadlinePreference: profile.deadline_preference ?? ""
  };

  try {
    // 서비스 롤로 RLS 우회해서 삭제 (일반 유저는 delete 권한 없음)
    const adminClient = createSupabaseAdminClient();
    const { error: deleteError } = await adminClient
      .from("recommendations")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[regenerate] 캐시 삭제 실패:", deleteError.message);
      return NextResponse.json(
        { code: "DELETE_ERROR", message: "기존 추천 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    const result = await runRecommendationFlow({
      supabase,
      userId: user.id,
      profile: profileInput,
      skipAI: true
    });

    // Next.js 서버 컴포넌트 캐시 무효화
    revalidatePath("/results");
    revalidatePath("/dashboard");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        code: "OPENAI_ERROR",
        message: error instanceof Error ? error.message : "추천 재생성에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
