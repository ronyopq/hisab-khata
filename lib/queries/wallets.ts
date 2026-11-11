import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export async function getWallets() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("wallet_balances").select("*").eq("book_id", book.id).order("is_archived", { ascending: true });
  return data ?? [];
}

export async function getWalletsWithMeta() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("wallets").select("*").eq("book_id", book.id).order("sort_order", { ascending: true });
  return data ?? [];
}
