"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  CreateRequestInput,
  ProfileInput,
  ProjectStatus,
  SubmitBidInput,
  UserRole
} from "@/lib/types";
import {
  authSchema,
  createRequestSchema,
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

export async function signUpAction(input: { email: string; password: string }): Promise<ActionResult<{ nextPath: string }>> {
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

  return { ok: true, data: { nextPath: "/onboarding" }, message: "회원가입이 완료되었습니다." };
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
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  const nextPath = profile?.onboarding_completed ? "/results" : "/onboarding";
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
      profile: parsed.data
    });

    revalidatePath("/results");

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
    return forbidden("Maker 계정만 입찰할 수 있습니다.");
  }

  const { data: makerProfile } = await supabase
    .from("maker_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!makerProfile?.is_verified) {
    return forbidden("검증된 Maker만 입찰할 수 있습니다.");
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
