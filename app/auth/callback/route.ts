import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed, created_at")
      .eq("id", data.user.id)
      .maybeSingle();

    const cookieStore = await cookies();
    const intendedRole = cookieStore.get("oauth_intended_role")?.value;
    const flowMode = cookieStore.get("oauth_flow_mode")?.value;

    const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : null;
    const isFreshProfile = createdAt ? Date.now() - createdAt < 10 * 60 * 1000 : false;

    if (intendedRole === "MAKER" && profile && !profile.onboarding_completed && profile.role === "USER") {
      await supabase.from("profiles").update({ role: "MAKER" }).eq("id", data.user.id);
      const response = NextResponse.redirect(new URL("/maker/onboarding", origin));
      response.cookies.delete("oauth_intended_role");
      response.cookies.delete("oauth_flow_mode");
      return response;
    }

    if (
      flowMode === "signin" &&
      !intendedRole &&
      (!profile ||
        (profile.role === "USER" && !profile.onboarding_completed && isFreshProfile))
    ) {
      const response = NextResponse.redirect(new URL("/auth/role", origin));
      response.cookies.delete("oauth_intended_role");
      response.cookies.delete("oauth_flow_mode");
      return response;
    }

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
    response.cookies.delete("oauth_flow_mode");
    return response;
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/auth?error=server_error", origin));
  }
}
