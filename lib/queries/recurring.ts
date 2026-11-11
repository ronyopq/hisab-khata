import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export async function getRecurring() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("recurring_rules").select("*, categories:category_id(name_bn), wallets:wallet_id(name)").eq("book_id", book.id).order("next_run_at");
  return data ?? [];
}
