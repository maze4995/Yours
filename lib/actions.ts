"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  CreateRequestInput,
  MakerOnboardingInput,
  ProfileInput,
  ProjectStatus,
  SubmitBidInput,
  UserRole
} from "@/lib/types";
import {
  authSchema,
  createRequestSchema,
  makerOnboardingSchema,
  onboardingSchema,
  submitBidSchema,
  updateProjectStatusSchema
} from "@/lib/validators";
import { runRecommendationFlow } from "@/lib/recommendation/service";
import { canSubmitBid } from "@/lib/domain/bid-rules";

async function getCurrentContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile };
}

function forbidden<T = void>(message = "권한이 없습니다."): ActionResult<T> {
  return { ok: false, code: "FORBIDDEN", message };
}

export async function signOutAndRedirectAction(formData: FormData): Promise<void> {
  "use server";
  void formData;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signUpAction(input: {
  email: string;
  password: string;
  role?: "USER" | "MAKER";
}): Promise<ActionResult<{ nextPath: string }>> {
  const parsed = authSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) {
    return { ok: false, code: "AUTH_SIGNUP_FAILED", message: error.message };
  }

  const nextPath = input.role === "MAKER" ? "/maker/onboarding" : "/onboarding";
  return { ok: true, data: { nextPath }, message: "회원가입이 완료되었습니다." };
}

export async function signInAction(input: { email: string; password: string }): Promise<ActionResult<{ nextPath: string }>> {
  const parsed = authSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error || !data.user) {
    return {
      ok: false,
      code: "AUTH_SIGNIN_FAILED",
      message: error?.message ?? "로그인에 실패했습니다."
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  let nextPath: string;
  if (profile?.role === "MAKER") {
    nextPath = "/maker/dashboard";
  } else if (profile?.onboarding_completed) {
    nextPath = "/results";
  } else {
    nextPath = "/onboarding";
  }
  return { ok: true, data: { nextPath }, message: "로그인되었습니다." };
}

export async function signOutAction(): Promise<ActionResult<{ nextPath: string }>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, code: "AUTH_SIGNOUT_FAILED", message: error.message };
  }

  return { ok: true, data: { nextPath: "/" } };
}

export async function selectSocialRoleAction(
  role: "USER" | "MAKER"
): Promise<ActionResult<{ nextPath: string }>> {
  const { supabase, user, profile } = await getCurrentContext();
  if (!supabase || !user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  if (role !== "USER" && role !== "MAKER") {
    return { ok: false, code: "VALIDATION_ERROR", message: "역할 선택값이 올바르지 않습니다." };
  }

  if (profile?.onboarding_completed) {
    if (profile.role === "MAKER") {
      return { ok: true, data: { nextPath: "/maker/dashboard" } };
    }
    return { ok: true, data: { nextPath: "/results" } };
  }

  const nextRole = role;

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").upsert({
      id: user.id,
      role: nextRole,
      onboarding_completed: false
    });
    if (insertError) {
      return { ok: false, code: "PROFILE_UPDATE_ERROR", message: insertError.message };
    }
  } else if (profile.role !== nextRole) {
    const { error: updateError } = await supabase.from("profiles").update({ role: nextRole }).eq("id", user.id);
    if (updateError) {
      return { ok: false, code: "PROFILE_UPDATE_ERROR", message: updateError.message };
    }
  }

  if (nextRole === "MAKER") {
    return { ok: true, data: { nextPath: "/maker/onboarding" } };
  }

  return { ok: true, data: { nextPath: "/onboarding" } };
}

export async function completeMakerOnboardingAction(
  payload: MakerOnboardingInput
): Promise<ActionResult<{ nextPath: string }>> {
  const parsed = makerOnboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const { supabase, user } = await getCurrentContext();
  if (!supabase || !user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  // 프로필 role을 MAKER로 업데이트
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "MAKER" })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, code: "PROFILE_UPDATE_ERROR", message: profileError.message };
  }

  // maker_profiles 생성 (이미 있으면 업데이트)
  const { error: makerError } = await supabase.from("maker_profiles").upsert({
    user_id: user.id,
    display_name: parsed.data.displayName,
    headline: parsed.data.headline || null,
    skills: parsed.data.skills,
    portfolio_links: parsed.data.portfolioLinks
  });

  if (makerError) {
    return { ok: false, code: "MAKER_PROFILE_ERROR", message: makerError.message };
  }

  revalidatePath("/maker/dashboard");
  return { ok: true, data: { nextPath: "/maker/dashboard" }, message: "개발자 프로필이 생성되었습니다." };
}

export async function saveOnboardingAction(payload: ProfileInput): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: parsed.data.fullName,
    job_title: parsed.data.jobTitle,
    industry: parsed.data.industry,
    team_size: parsed.data.teamSize,
    pain_points: parsed.data.painPoints,
    goals: parsed.data.goals,
    current_tools: parsed.data.currentTools,
    budget_preference: parsed.data.budgetPreference,
    deadline_preference: parsed.data.deadlinePreference,
    onboarding_completed: false
  });

  if (error) {
    return { ok: false, code: "UPSERT_FAILED", message: error.message };
  }

  return { ok: true, data: undefined, message: "온보딩이 임시 저장되었습니다." };
}

export async function completeOnboardingAndRecommendAction(
  payload: ProfileInput
): Promise<ActionResult<{ nextPath: string; recommendationId: string }>> {
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { error: upsertError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: parsed.data.fullName,
    job_title: parsed.data.jobTitle,
    industry: parsed.data.industry,
    team_size: parsed.data.teamSize,
    pain_points: parsed.data.painPoints,
    goals: parsed.data.goals,
    current_tools: parsed.data.currentTools,
    budget_preference: parsed.data.budgetPreference,
    deadline_preference: parsed.data.deadlinePreference,
    onboarding_completed: true
  });

  if (upsertError) {
    return { ok: false, code: "UPSERT_FAILED", message: upsertError.message };
  }

  try {
    const result = await runRecommendationFlow({
      supabase,
      userId: user.id,
      profile: parsed.data,
      skipAI: true
    });

    revalidatePath("/results");
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: {
        nextPath: "/results",
        recommendationId: result.recommendationId ?? ""
      }
    };
  } catch (error) {
    return {
      ok: false,
      code: "OPENAI_ERROR",
      message: error instanceof Error ? error.message : "추천 생성 중 오류가 발생했습니다."
    };
  }
}

export async function createRequestAction(
  payload: CreateRequestInput
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = createRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const { supabase, user, profile } = await getCurrentContext();
  if (!user || !profile) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  if (!["USER", "ADMIN"].includes(profile.role as UserRole)) {
    return forbidden("요청 생성 권한이 없습니다.");
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      requirements: parsed.data.requirements,
      budget_min: parsed.data.budgetMin,
      budget_max: parsed.data.budgetMax,
      deadline_date: parsed.data.deadlineDate,
      priority: parsed.data.priority,
      status: "open",
      recommendation_id: parsed.data.recommendationId ?? null
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, code: "CREATE_FAILED", message: error?.message ?? "요청 생성에 실패했습니다." };
  }

  revalidatePath("/settings");
  revalidatePath(`/request/${data.id}`);

  return { ok: true, data: { requestId: data.id } };
}

export async function getRequestDetailAction(requestId: string): Promise<ActionResult<{ request: unknown; bids: unknown[] }>> {
  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    return { ok: false, code: "NOT_FOUND", message: "요청을 찾을 수 없습니다." };
  }

  const { data: bids } = await supabase
    .from("bids")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(10);

  return { ok: true, data: { request, bids: bids ?? [] } };
}

export async function submitBidAction(
  requestId: string,
  payload: SubmitBidInput
): Promise<ActionResult<{ bidId: string }>> {
  const parsed = submitBidSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const { supabase, user, profile } = await getCurrentContext();
  if (!user || !profile) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  if (profile.role !== "MAKER") {
    return forbidden("개발자 계정만 입찰할 수 있습니다.");
  }

  const { data: makerProfile } = await supabase
    .from("maker_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!makerProfile?.is_verified) {
    return forbidden("검증된 개발자만 입찰할 수 있습니다.");
  }

  const { data: openRequests } = await supabase.rpc("rpc_list_open_requests", {
    limit_count: 50,
    offset_count: 0
  });

  const targetOpenRequest = (openRequests ?? []).find(
    (request: { request_id: string }) => request.request_id === requestId
  );

  const { data: existingBid } = await supabase
    .from("bids")
    .select("id")
    .eq("request_id", requestId)
    .eq("maker_id", user.id)
    .maybeSingle();

  const bidRule = canSubmitBid({
    role: profile.role as UserRole,
    isVerifiedMaker: makerProfile.is_verified,
    requestStatus: targetOpenRequest ? "open" : null,
    hasExistingBid: Boolean(existingBid)
  });

  if (!bidRule.allowed) {
    if (bidRule.reason?.includes("열려있지")) {
      return { ok: false, code: "REQUEST_CLOSED", message: bidRule.reason };
    }
    if (bidRule.reason?.includes("이미")) {
      return { ok: false, code: "DUPLICATE_BID", message: bidRule.reason };
    }
    return forbidden(bidRule.reason);
  }

  const { data, error } = await supabase
    .from("bids")
    .insert({
      request_id: requestId,
      maker_id: user.id,
      price: parsed.data.price,
      delivery_days: parsed.data.deliveryDays,
      approach_summary: parsed.data.approachSummary,
      maintenance_option: parsed.data.maintenanceOption,
      portfolio_link: parsed.data.portfolioLink ?? null
    })
    .select("id")
    .single();

  if (error || !data) {
    const isDuplicate = error?.message?.toLowerCase().includes("duplicate");
    return {
      ok: false,
      code: isDuplicate ? "DUPLICATE_BID" : "CREATE_FAILED",
      message: isDuplicate ? "이미 이 요청에 입찰했습니다." : error?.message ?? "입찰 제출에 실패했습니다."
    };
  }

  revalidatePath(`/bids/${requestId}`);
  return { ok: true, data: { bidId: data.id } };
}

export async function withdrawBidAction(bidId: string): Promise<ActionResult> {
  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("bids")
    .update({
      status: "withdrawn"
    })
    .eq("id", bidId)
    .eq("maker_id", user.id)
    .eq("status", "submitted");

  if (error) {
    return { ok: false, code: "INVALID_STATE", message: error.message };
  }

  revalidatePath("/settings");
  return { ok: true, data: undefined, message: "입찰을 철회했습니다." };
}

export async function selectBidAction(
  requestId: string,
  bidId: string
): Promise<ActionResult<{ projectId: string }>> {
  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase.rpc("accept_bid_and_create_project", {
    p_request_id: requestId,
    p_bid_id: bidId
  });

  if (error || !data) {
    return { ok: false, code: "RPC_FAILED", message: error?.message ?? "입찰 선택에 실패했습니다." };
  }

  revalidatePath(`/request/${requestId}`);
  revalidatePath(`/bids/${requestId}`);

  return { ok: true, data: { projectId: data as string }, message: "입찰이 선택되었습니다." };
}

export async function getProjectDetailAction(projectId: string): Promise<ActionResult<{ project: unknown; events: unknown[] }>> {
  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "*, requests:request_id (title, summary), bids:accepted_bid_id (price, delivery_days, approach_summary, maintenance_option)"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, code: "NOT_FOUND", message: "프로젝트를 찾을 수 없습니다." };
  }

  const { data: events } = await supabase
    .from("project_events")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return { ok: true, data: { project, events: events ?? [] } };
}

export async function updateProjectStatusAction(
  projectId: string,
  status: ProjectStatus,
  note?: string
): Promise<ActionResult> {
  const parsed = updateProjectStatusSchema.safeParse({
    projectId,
    status,
    note
  });

  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력이 잘못되었습니다." };
  }

  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.projectId);

  if (updateError) {
    return { ok: false, code: "UPDATE_FAILED", message: updateError.message };
  }

  const { error: eventError } = await supabase.from("project_events").insert({
    project_id: parsed.data.projectId,
    actor_id: user.id,
    event_type: "status_changed",
    event_note: parsed.data.note ?? `상태가 ${parsed.data.status} 로 변경되었습니다.`
  });

  if (eventError) {
    return { ok: false, code: "UPDATE_FAILED", message: eventError.message };
  }

  revalidatePath(`/project/${projectId}`);
  return { ok: true, data: undefined, message: "프로젝트 상태를 업데이트했습니다." };
}

export async function getSettingsSummaryAction(): Promise<
  ActionResult<{ account: unknown; myRequests: unknown[]; myProjects: unknown[] }>
> {
  const { supabase, user, profile } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { data: myRequests } = await supabase
    .from("requests")
    .select("id, title, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: myProjects } = await supabase
    .from("projects")
    .select("id, status, created_at, request_id")
    .or(`user_id.eq.${user.id},maker_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return {
    ok: true,
    data: {
      account: profile,
      myRequests: myRequests ?? [],
      myProjects: myProjects ?? []
    }
  };
}

export async function deleteRequestAction(requestId: string): Promise<ActionResult> {
  const { supabase, user } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    return { ok: false, code: "NOT_FOUND", message: "요청을 찾을 수 없습니다." };
  }

  if (request.user_id !== user.id) {
    return forbidden("본인 요청만 삭제할 수 있습니다.");
  }

  const { data: linkedProject } = await supabase
    .from("projects")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (linkedProject || request.status === "selected") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "이미 프로젝트가 연결된 요청은 삭제할 수 없습니다."
    };
  }

  const { error: deleteError } = await supabase
    .from("requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { ok: false, code: "DELETE_FAILED", message: deleteError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { ok: true, data: undefined, message: "요청이 삭제되었습니다." };
}

export async function getDashboardDataAction(): Promise<
  ActionResult<{
    account: unknown;
    recommendations: unknown[];
    myRequests: unknown[];
    myProjects: unknown[];
  }>
> {
  const { supabase, user, profile } = await getCurrentContext();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  const { data: recommendations, error: recommendationsError } = await supabase
    .from("recommendations")
    .select("id, fit_decision, fit_reason, created_at, updated_at, profile_snapshot, items")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (recommendationsError) {
    return { ok: false, code: "QUERY_FAILED", message: recommendationsError.message };
  }

  const { data: myRequests } = await supabase
    .from("requests")
    .select("id, title, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: myProjects } = await supabase
    .from("projects")
    .select("id, status, created_at, request_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return {
    ok: true,
    data: {
      account: profile,
      recommendations: recommendations ?? [],
      myRequests: myRequests ?? [],
      myProjects: myProjects ?? []
    }
  };
}

export async function getMakerDashboardAction(): Promise<
  ActionResult<{
    makerProfile: unknown;
    openRequests: unknown[];
    myBids: unknown[];
    myProjects: unknown[];
  }>
> {
  const { supabase, user, profile } = await getCurrentContext();
  if (!user || !profile) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  if (profile.role !== "MAKER" && profile.role !== "ADMIN") {
    return { ok: false, code: "FORBIDDEN", message: "개발자 계정만 접근할 수 있습니다." };
  }

  const { data: makerProfile } = await supabase
    .from("maker_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: myBids } = await supabase
    .from("bids")
    .select("id, request_id, price, delivery_days, status, created_at, requests(title, status)")
    .eq("maker_id", user.id)
    .order("created_at", { ascending: false });

  const { data: myProjects } = await supabase
    .from("projects")
    .select("id, status, created_at, request_id, requests(title)")
    .eq("maker_id", user.id)
    .order("created_at", { ascending: false });

  return {
    ok: true,
    data: {
      makerProfile: makerProfile ?? null,
      openRequests: [],
      myBids: myBids ?? [],
      myProjects: myProjects ?? []
    }
  };
}

export async function setMakerVerificationAction(
  makerUserId: string,
  nextVerified: boolean
): Promise<ActionResult> {
  const { supabase, user, profile } = await getCurrentContext();
  if (!user || !profile) {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." };
  }

  if (profile.role !== "ADMIN") {
    return forbidden("관리자만 개발자 검증 상태를 변경할 수 있습니다.");
  }

  const { data: updated, error } = await supabase
    .from("maker_profiles")
    .update({
      is_verified: nextVerified
    })
    .eq("user_id", makerUserId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "UPDATE_FAILED", message: error.message };
  }

  if (!updated) {
    return { ok: false, code: "NOT_FOUND", message: "개발자 프로필을 찾을 수 없습니다." };
  }

  revalidatePath("/admin/makers");
  revalidatePath("/maker/dashboard");
  revalidatePath(`/makers/${makerUserId}`);

  return {
    ok: true,
    data: undefined,
    message: nextVerified ? "개발자 검증을 승인했습니다." : "개발자 검증을 해제했습니다."
  };
}
