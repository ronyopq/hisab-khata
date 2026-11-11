import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export async function getCategories(type?: "income" | "expense") {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  let q = supabase.from("categories").select("*").eq("book_id", book.id).order("sort_order", { ascending: true });
  if (type) q = q.eq("type", type);
  const { data } = await q;
  return data ?? [];
}
