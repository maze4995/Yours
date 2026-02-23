import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type UserRole } from "@/lib/types";

type CurrentUserContext = {
  supabase: SupabaseClient | null;
  user: User | null;
};

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    return { supabase, user } satisfies CurrentUserContext;
  } catch (error) {
    console.warn(
      "[auth] Supabase client unavailable. Configure .env.local first.",
      error
    );
    return { supabase: null, user: null } satisfies CurrentUserContext;
  }
}

export async function getCurrentUserProfile() {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export async function requireAuth() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    redirect("/auth");
  }

  return { supabase, user };
}

export async function requireRole(roles: UserRole[]) {
  const { supabase, user, profile } = await getCurrentUserProfile();
  if (!user || !profile) {
    redirect("/auth");
  }

  if (!roles.includes(profile.role as UserRole)) {
    redirect("/settings");
  }

  return { supabase, user, profile };
}
