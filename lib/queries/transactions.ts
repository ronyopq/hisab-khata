import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export interface TxFilters {
  search?: string;
  type?: "income" | "expense" | "transfer";
  categoryId?: string;
  walletId?: string;
  tag?: string;
  from?: string;
  to?: string;
  minAmount?: bigint;
  maxAmount?: bigint;
  sort?: "newest" | "oldest" | "highest" | "lowest";
}

export async function getTransactions(page = 0, pageSize = 30, filters: TxFilters = {}) {
  const book = await getActiveBook();
  if (!book) return { data: [], count: 0 };
  const supabase = await createClient();
  let q = supabase
    .from("transactions")
    .select("*, wallets:wallet_id(name), to_wallets:to_wallet_id(name), categories:category_id(name_bn, name_en, icon, color)", { count: "exact" })
    .eq("book_id", book.id)
    .is("deleted_at", null);

  if (filters.type) q = q.eq("type", filters.type);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.walletId) q = q.eq("wallet_id", filters.walletId);
  if (filters.tag) q = q.contains("tags", [filters.tag]);
  if (filters.from) q = q.gte("occurred_at", filters.from);
  if (filters.to) q = q.lte("occurred_at", filters.to);
  if (filters.minAmount !== undefined) q = q.gte("amount", filters.minAmount.toString());
  if (filters.maxAmount !== undefined) q = q.lte("amount", filters.maxAmount.toString());
  if (filters.search) {
    // `,` `(` `)` and `*` are filter grammar in PostgREST `.or()` strings.
    const term = filters.search.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
    if (term) {
      const s = `%${term}%`;
      q = q.or(`note.ilike.${s},payee.ilike.${s}`);
    }
  }

  switch (filters.sort) {
    case "oldest": q = q.order("occurred_at", { ascending: true }); break;
    case "highest": q = q.order("amount", { ascending: false }); break;
    case "lowest": q = q.order("amount", { ascending: true }); break;
    default: q = q.order("occurred_at", { ascending: false });
  }

  const from = page * pageSize;
  const { data, count } = await q.range(from, from + pageSize - 1);
  return { data: data ?? [], count: count ?? 0 };
}

export async function getTransactionById(id: string) {
  // Scope to the active book: an id from another book must not be readable
  // even though RLS would allow it for a member of both books.
  const book = await getActiveBook();
  if (!book) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*, wallets:wallet_id(name), to_wallets:to_wallet_id(name), categories:category_id(name_bn, name_en, icon, color)")
    .eq("id", id)
    .eq("book_id", book.id)
    .maybeSingle();
  return data;
}
