import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export async function getBudgets(month?: string) {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const m = month ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const { data } = await supabase.from("budget_usage").select("*, categories:category_id(name_bn, name_en)").eq("book_id", book.id).eq("month", m);
  return data ?? [];
}
