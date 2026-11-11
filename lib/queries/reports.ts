import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";
import { getDashboardSummary, getMonthlyTrend, getPeriodRange } from "./dashboard";

export async function getReportData(period: "thisMonth" | "lastMonth" | "thisYear" | "custom" = "thisMonth") {
  const book = await getActiveBook();
  if (!book) return null;
  const supabase = await createClient();
  const { from, to } = getPeriodRange(period);
  const [summary, trend12, wallets, topExpenses, cashFlow] = await Promise.all([
    getDashboardSummary(period),
    getMonthlyTrend(12),
    supabase.from("wallet_balances").select("*").eq("book_id", book.id).then((r) => r.data ?? []),
    supabase.from("transactions").select("*, categories:category_id(name_bn, name_en)").eq("book_id", book.id).eq("type", "expense").is("deleted_at", null).gte("occurred_at", from).lt("occurred_at", to).order("amount", { ascending: false }).limit(10).then((r) => r.data ?? []),
    getMonthlyTrend(12),
  ]);
  return { summary, trend: trend12, wallets, topExpenses, cashFlow, from, to, book };
}

export async function getAllTransactionsForExport() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("*, wallets:wallet_id(name), categories:category_id(name_bn, name_en)").eq("book_id", book.id).is("deleted_at", null).order("occurred_at", { ascending: false }).limit(5000);
  return data ?? [];
}
