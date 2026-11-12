"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6);

export type AuthActionResult = {
  error?: string;
  success?: boolean;
  url?: string;
};

function toError(e: unknown, fallback: string): AuthActionResult {
  return { error: e instanceof Error ? e.message : fallback };
}

/** Never fall back to localhost in production: a wrong origin breaks every email link. */
function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function signInWithPassword(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = emailSchema.parse(formData.get("email"));
    const password = passwordSchema.parse(formData.get("password"));
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Login failed");
  }
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  try {
    const fullName = z.string().min(2).parse(formData.get("fullName"));
    const email = emailSchema.parse(formData.get("email"));
    const password = passwordSchema.parse(formData.get("password"));
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Signup failed");
  }
}

export async function signInWithGoogle(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    if (data.url) return { success: true, url: data.url };
    return { error: "Google sign-in failed" };
  } catch (e) {
    return toError(e, "Google sign-in failed");
  }
}

export async function signInWithMagicLink(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = emailSchema.parse(formData.get("email"));
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Magic link failed");
  }
}

export async function signOut(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (e) {
    return toError(e, "Sign out failed");
  }
}

export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = emailSchema.parse(formData.get("email"));
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Must go through /auth/callback so the recovery code is exchanged for a session.
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Password reset failed");
  }
}

export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
  try {
    const password = passwordSchema.parse(formData.get("password"));
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Password update failed");
  }
}

export async function changePassword(formData: FormData): Promise<AuthActionResult> {
  try {
    const password = passwordSchema.parse(formData.get("newPassword"));
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Password change failed");
  }
}

export async function deleteAccount(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // 1) Re-parent / remove every row a RESTRICT foreign key points at us.
    //    Done as the user, through a SECURITY DEFINER function, so RLS still applies.
    const { error: dataError } = await supabase.rpc("delete_my_account_data");
    if (dataError) return { error: dataError.message };

    // 2) Only then delete the auth user (service role, server-only).
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) return { error: authError.message };

    await supabase.auth.signOut();
    return { success: true };
  } catch (e) {
    return toError(e, "Delete account failed");
  }
}

export async function acceptInviteAction(token: string): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_invite", { p_token: token });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return toError(e, "Accept invitation failed");
  }
}
