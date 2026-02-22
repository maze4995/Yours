import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type UserRole } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function getCurrentUserProfile() {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
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
  if (!user) {
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
