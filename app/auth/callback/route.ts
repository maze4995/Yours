import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", origin));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("[auth/callback] session exchange failed:", error?.message);
      return NextResponse.redirect(new URL("/auth?error=oauth_failed", origin));
    }

    // 프로필 조회 (trigger로 자동 생성됨)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    // 소셜 가입 전 저장해둔 intended role 쿠키 읽기
    const cookieStore = await cookies();
    const intendedRole = cookieStore.get("oauth_intended_role")?.value;

    // MAKER 신규 가입: role 업데이트 + /maker/onboarding으로
    if (intendedRole === "MAKER" && profile && !profile.onboarding_completed && profile.role === "USER") {
      await supabase.from("profiles").update({ role: "MAKER" }).eq("id", data.user.id);

      const response = NextResponse.redirect(new URL("/maker/onboarding", origin));
      response.cookies.delete("oauth_intended_role");
      return response;
    }

    // 기존 사용자 or 일반 신규 USER
    let nextPath: string;
    const role = profile?.role ?? "USER";
    if (role === "MAKER") {
      nextPath = "/maker/dashboard";
    } else if (profile?.onboarding_completed) {
      nextPath = "/results";
    } else {
      nextPath = "/onboarding";
    }

    const response = NextResponse.redirect(new URL(nextPath, origin));
    response.cookies.delete("oauth_intended_role");
    return response;
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/auth?error=server_error", origin));
  }
}
