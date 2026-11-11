import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export interface DashboardSummary {
  current: { income: string; expense: string; net: string };
  previous: { income: string; expense: string; net: string };
  by_category: { id: string; name_bn: string; name_en: string; icon: string | null; color: string | null; total: string }[];
  daily: { day: string; income: string; expense: string }[];
}

export function getPeriodRange(period: "thisMonth" | "lastMonth" | "thisYear" | "custom", customFrom?: string, customTo?: string) {
  const now = new Date();
  if (period === "thisMonth") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString() };
  }
  if (period === "lastMonth") {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), to: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  if (period === "thisYear") {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: new Date(now.getFullYear() + 1, 0, 1).toISOString() };
  }
  return { from: new Date(customFrom ?? now.toISOString()).toISOString(), to: new Date(customTo ?? now.toISOString()).toISOString() };
}

export async function getDashboardSummary(period: "thisMonth" | "lastMonth" | "thisYear" | "custom" = "thisMonth", customFrom?: string, customTo?: string): Promise<DashboardSummary | null> {
  const book = await getActiveBook();
  if (!book) return null;
  const { from, to } = getPeriodRange(period, customFrom, customTo);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_summary", { p_book_id: book.id, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return data as DashboardSummary;
}

export async function getMonthlyTrend(months = 6) {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_monthly_trend", { p_book_id: book.id, p_months: months });
  if (error) throw new Error(error.message);
  return (data ?? []) as { month: string; income: string; expense: string }[];
}

export async function getTotalBalance() {
  const book = await getActiveBook();
  if (!book) return BigInt(0);
  const supabase = await createClient();
  const { data } = await supabase.from("wallet_balances").select("balance").eq("book_id", book.id);
  return (data ?? []).reduce((sum, r) => sum + BigInt(r.balance), BigInt(0));
}

export async function getUpcomingRecurring() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase.from("recurring_rules").select("*, categories:category_id(name_bn), wallets:wallet_id(name)").eq("book_id", book.id).eq("is_active", true).lte("next_run_at", in7).order("next_run_at");
  return data ?? [];
}

export async function getDebtsSummary() {
  const book = await getActiveBook();
  if (!book) return { toReceive: BigInt(0), toPay: BigInt(0) };
  const supabase = await createClient();
  const { data } = await supabase.from("debt_balances").select("direction, remaining").eq("book_id", book.id);
  let toReceive = BigInt(0);
  let toPay = BigInt(0);
  for (const r of data ?? []) {
    if (r.direction === "lent") toReceive += BigInt(r.remaining);
    else toPay += BigInt(r.remaining);
  }
  return { toReceive, toPay };
}

export async function getGoalsProgress() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data: goals } = await supabase.from("goals").select("*").eq("book_id", book.id).eq("status", "active");
  const result = [];
  for (const g of goals ?? []) {
    const { data: contribs } = await supabase.from("goal_contributions").select("amount").eq("goal_id", g.id);
    const saved = (contribs ?? []).reduce((s, c) => s + BigInt(c.amount), BigInt(0));
    result.push({ ...g, saved });
  }
  return result;
}

export async function getBudgetProgress() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const { data } = await supabase.from("budget_usage").select("*, categories:category_id(name_bn, name_en)").eq("book_id", book.id).eq("month", month);
  return data ?? [];
}

export async function getRecentTransactions(limit = 10) {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("*, wallets:wallet_id(name), categories:category_id(name_bn, name_en, icon, color)").eq("book_id", book.id).is("deleted_at", null).order("occurred_at", { ascending: false }).limit(limit);
  return data ?? [];
}
