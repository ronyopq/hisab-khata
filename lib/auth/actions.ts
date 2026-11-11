"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6);

export async function signInWithPassword(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const password = passwordSchema.parse(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
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
  if (error) throw new Error(error.message);
  redirect("/login?checkEmail=1");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) throw new Error(error.message);
  if (data.url) redirect(data.url);
}

export async function signInWithMagicLink(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) throw new Error(error.message);
  redirect("/login?checkEmail=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });
  if (error) throw new Error(error.message);
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = passwordSchema.parse(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function changePassword(formData: FormData) {
  const password = passwordSchema.parse(formData.get("newPassword"));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  redirect("/settings?passwordChanged=1");
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const admin = createAdminClient();
  // Profile cascade deletes books owned, etc. via FKs. Auth user delete last.
  await admin.from("profiles").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}

export async function acceptInviteAction(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}
