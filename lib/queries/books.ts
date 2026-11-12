import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface Book {
  id: string;
  name: string;
  currency: string;
  icon: string | null;
  color: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cached per-request: the dashboard fires ~9 queries in parallel and each one
 * needs the active book. Without cache() this was 9× (auth + profile + book)
 * = 27 sequential-ish round-trips. With cache() it runs exactly once.
 */
export const getActiveBook = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Single query: profile + its active book via join (was 2 separate queries).
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_book_id, books:active_book_id(*)")
    .eq("id", user.id)
    .single();
  const joined = profile?.books as unknown as Book | null;
  if (joined?.id) return joined;
  // Fallback: first book the user belongs to.
  const { data: first } = await supabase
    .from("book_members")
    .select("book_id, books:book_id(*)")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  return (first?.books as unknown as Book | null) ?? null;
});

export async function getMyBooks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("book_members").select("book_id, role, books(*)").eq("user_id", user.id);
  return data ?? [];
}

export async function getBookMembers(bookId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("book_members").select("*, profiles:user_id(full_name, avatar_url)").eq("book_id", bookId);
  return data ?? [];
}

export async function getBookInvites(bookId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("book_invites").select("*").eq("book_id", bookId).eq("status", "pending").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getActivityLog(bookId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase.from("activity_logs").select("*, profiles:user_id(full_name)").eq("book_id", bookId).order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}
