"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

const bookSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().default("BDT"),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function createBook(input: z.infer<typeof bookSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: book, error } = await supabase.from("books").insert({
    name: input.name,
    currency: input.currency,
    icon: input.icon || null,
    color: input.color || null,
    owner_id: user.id,
  }).select().single();
  if (error) throw new Error(error.message);
  await supabase.from("book_members").insert({ book_id: book.id, user_id: user.id, role: "owner" });
  await supabase.from("profiles").update({ active_book_id: book.id }).eq("id", user.id);
  revalidatePath("/books");
  revalidatePath("/dashboard");
  return book;
}

export async function switchActiveBook(bookId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  // Verify membership
  const { data: member } = await supabase.from("book_members").select("book_id").eq("book_id", bookId).eq("user_id", user.id).single();
  if (!member) throw new Error("Not a member");
  await supabase.from("profiles").update({ active_book_id: bookId }).eq("id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/books");
}

export async function inviteMember(input: { bookId: string; email: string; role: "owner" | "editor" | "viewer" }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const token = randomBytes(24).toString("hex");
  const { data, error } = await supabase.from("book_invites").insert({
    book_id: input.bookId,
    email: input.email.toLowerCase(),
    role: input.role,
    token,
    invited_by: user.id,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/books");
  return { ...data, inviteLink: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/invite/${token}` };
}

export async function changeMemberRole(bookId: string, userId: string, role: "owner" | "editor" | "viewer") {
  const supabase = await createClient();
  const { error } = await supabase.from("book_members").update({ role }).eq("book_id", bookId).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/books");
}

export async function removeMember(bookId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("book_members").delete().eq("book_id", bookId).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/books");
}

export async function leaveBook(bookId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  // Owner cannot leave without transferring — check
  const { data: member } = await supabase.from("book_members").select("role").eq("book_id", bookId).eq("user_id", user.id).single();
  if (member?.role === "owner") throw new Error("Transfer ownership before leaving");
  await supabase.from("book_members").delete().eq("book_id", bookId).eq("user_id", user.id);
  revalidatePath("/books");
  revalidatePath("/dashboard");
}

export async function transferOwnership(bookId: string, newOwnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("book_members").update({ role: "editor" }).eq("book_id", bookId).eq("user_id", user.id);
  await supabase.from("book_members").update({ role: "owner" }).eq("book_id", bookId).eq("user_id", newOwnerId);
  await supabase.from("books").update({ owner_id: newOwnerId }).eq("id", bookId);
  revalidatePath("/books");
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient();
  await supabase.from("book_invites").update({ status: "revoked" }).eq("id", inviteId);
  revalidatePath("/books");
}
