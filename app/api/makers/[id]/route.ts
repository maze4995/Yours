import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: maker } = await supabase
    .from("maker_profiles")
    .select(
      "user_id, display_name, headline, bio, skills, portfolio_links, is_verified, verification_badge, rating, completed_projects_count"
    )
    .eq("user_id", id)
    .maybeSingle();

  if (!maker) {
    return NextResponse.json({ code: "NOT_FOUND", message: "개발자 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ maker });
}
