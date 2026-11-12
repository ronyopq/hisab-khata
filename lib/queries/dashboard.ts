import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export interface DashboardSummary {
  current: { income: string; expense: string; net: string };
  previous: { income: string; expense: string; net: string };
  by_category: { id: string; name_bn: string; name_en: string; icon: string | null; color: string | null; total: string }[];
  daily: { day: string; income: string; expense: string }[];
}

/**
 * Month boundaries are computed in Dhaka (UTC+6), not UTC. A 00:30 Dhaka
 * expense on the 1st was previously counted in the previous month.
 */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

function dhakaParts(now = new Date()) {
  const shifted = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

/** Midnight Dhaka on the given year/month/day, expressed as a UTC ISO string. */
function dhakaMidnight(year: number, month: number, day = 1): string {
  return new Date(Date.UTC(year, month, day) - DHAKA_OFFSET_MS).toISOString();
}

export function getPeriodRange(
  period: "thisMonth" | "lastMonth" | "thisYear" | "custom",
  customFrom?: string,
  customTo?: string
) {
  const { year, month } = dhakaParts();

  if (period === "thisMonth") {
    return { from: dhakaMidnight(year, month), to: dhakaMidnight(year, month + 1) };
  }
  if (period === "lastMonth") {
    return { from: dhakaMidnight(year, month - 1), to: dhakaMidnight(year, month) };
  }
  if (period === "thisYear") {
    return { from: dhakaMidnight(year, 0), to: dhakaMidnight(year + 1, 0) };
  }

  // Custom: a single day when only `from` is given; never a zero-length range.
  const fromDate = customFrom ? new Date(`${customFrom}T00:00:00+06:00`) : new Date();
  const toDate = customTo ? new Date(`${customTo}T23:59:59.999+06:00`) : null;
  const start = Number.isNaN(fromDate.getTime()) ? new Date() : fromDate;
  const end = toDate && !Number.isNaN(toDate.getTime())
    ? toDate
    : new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from: start.toISOString(), to: end.toISOString() };
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

export async function getTotalBalance(): Promise<string> {
  const book = await getActiveBook();
  if (!book) return "0";
  const supabase = await createClient();
  // Archived wallets keep their history but must not count towards "total balance".
  const { data } = await supabase
    .from("wallet_balances")
    .select("balance, is_archived")
    .eq("book_id", book.id)
    .eq("is_archived", false);
  return (data ?? []).reduce((sum, r) => sum + BigInt(r.balance ?? 0), BigInt(0)).toString();
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
  // Single query for all contributions (was N+1: one query per goal).
  const [{ data: goals }, { data: contribs }] = await Promise.all([
    supabase.from("goals").select("*").eq("book_id", book.id).eq("status", "active"),
    supabase.from("goal_contributions").select("goal_id, amount"),
  ]);
  const savedByGoal = new Map<string, bigint>();
  for (const c of contribs ?? []) {
    savedByGoal.set(c.goal_id, (savedByGoal.get(c.goal_id) ?? BigInt(0)) + BigInt(c.amount));
  }
  return (goals ?? []).map((g) => ({ ...g, saved: savedByGoal.get(g.id) ?? BigInt(0) }));
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
