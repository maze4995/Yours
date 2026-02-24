import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: makerProfile } = await supabase
    .from("maker_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "MAKER" || !makerProfile?.is_verified) {
    return NextResponse.json({ code: "FORBIDDEN", message: "검증된 개발자만 접근할 수 있습니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "10"), 1), 10);
  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("rpc_list_open_requests", {
    limit_count: pageSize,
    offset_count: offset
  });

  if (error) {
    return NextResponse.json({ code: "RPC_FAILED", message: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data ?? [], page, pageSize });
}
