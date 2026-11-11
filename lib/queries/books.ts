import { createClient } from "@/lib/supabase/server";

export async function getActiveBook() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("active_book_id").eq("id", user.id).single();
  let bookId = profile?.active_book_id;
  if (!bookId) {
    const { data: first } = await supabase.from("book_members").select("book_id").eq("user_id", user.id).limit(1).single();
    bookId = first?.book_id ?? null;
  }
  if (!bookId) return null;
  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
  return book;
}

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
