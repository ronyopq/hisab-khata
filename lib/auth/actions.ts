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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
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
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
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
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
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
    const admin = createAdminClient();
    // Profile cascade deletes books owned, etc. via FKs. Auth user delete last.
    await admin.from("profiles").delete().eq("id", user.id);
    await admin.auth.admin.deleteUser(user.id);
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
