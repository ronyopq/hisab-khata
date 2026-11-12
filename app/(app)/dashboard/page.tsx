import { getTranslations } from "next-intl/server";
import { getDashboardSummary, getMonthlyTrend, getTotalBalance, getUpcomingRecurring, getDebtsSummary, getGoalsProgress, getBudgetProgress, getRecentTransactions } from "@/lib/queries/dashboard";
import { getWallets } from "@/lib/queries/wallets";
import { formatMoney, pctChange } from "@/lib/format/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HeroBalance, StatCard } from "@/components/dashboard/HeroBalance";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
const CategoryDonut = dynamic(() => import("@/components/charts/CategoryDonut").then((m) => m.CategoryDonut), { loading: () => <Skeleton className="h-52 w-full" /> });
const MonthlyBarChart = dynamic(() => import("@/components/charts/TrendCharts").then((m) => m.MonthlyBarChart), { loading: () => <Skeleton className="h-52 w-full" /> });
const DailyAreaChart = dynamic(() => import("@/components/charts/TrendCharts").then((m) => m.DailyAreaChart), { loading: () => <Skeleton className="h-52 w-full" /> });
import { EmptyState } from "@/components/layout/EmptyState";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { formatDate } from "@/lib/format/date";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const t = await getTranslations("dashboard");
  const params = await searchParams;
  const validPeriods = ["thisMonth", "lastMonth", "thisYear", "custom"] as const;
  const period = validPeriods.includes(params.period as never)
    ? (params.period as (typeof validPeriods)[number])
    : "thisMonth";

  const [summary, trend, total, wallets, upcoming, debts, goals, budgets, recent] = await Promise.all([
    getDashboardSummary(period, params.from, params.to),
    getMonthlyTrend(6),
    getTotalBalance(),
    getWallets(),
    getUpcomingRecurring(),
    getDebtsSummary(),
    getGoalsProgress(),
    getBudgetProgress(),
    getRecentTransactions(10),
  ]);

  const cur = summary?.current ?? { income: "0", expense: "0", net: "0" };
  const prev = summary?.previous ?? { income: "0", expense: "0", net: "0" };
  const incomeChange = pctChange(BigInt(cur.income), BigInt(prev.income));
  const expenseChange = pctChange(BigInt(cur.expense), BigInt(prev.expense));
  const netChange = pctChange(BigInt(cur.net), BigInt(prev.net));
  const savingsRate = BigInt(cur.income) > BigInt(0) ? Number(BigInt(cur.net) * BigInt(100) / BigInt(cur.income)) : 0;

  const groupedRecent = new Map<string, typeof recent>();
  for (const tx of recent) {
    const day = tx.occurred_at.slice(0, 10);
    if (!groupedRecent.has(day)) groupedRecent.set(day, []);
    groupedRecent.get(day)!.push(tx);
  }

  return (
    <div className="space-y-5">
      {/* Period selector — a plain GET form so a custom range can actually be picked. */}
      <div className="flex flex-wrap items-center gap-2">
        {([["thisMonth", t("thisMonth")], ["lastMonth", t("lastMonth")], ["thisYear", t("thisYear")]] as const).map(([key, label]) => (
          <Link key={key} href={`/dashboard?period=${key}`} className={period === key ? "shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground min-h-10" : "shrink-0 rounded-full border px-4 py-2 text-sm font-medium min-h-10"}>
            {label}
          </Link>
        ))}
        <form action="/dashboard" method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="period" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            aria-label={t("from")}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground">→</span>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            aria-label={t("to")}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          />
          <button
            type="submit"
            className={period === "custom" ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground min-h-10" : "rounded-full border px-4 py-2 text-sm font-medium min-h-10"}
          >
            {t("customRange")}
          </button>
        </form>
      </div>

      <HeroBalance total={total} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("income")} value={formatMoney(BigInt(cur.income))} change={incomeChange.pct} up={incomeChange.up} colorClass="text-income" />
        <StatCard label={t("expense")} value={formatMoney(BigInt(cur.expense))} change={expenseChange.pct} up={!expenseChange.up} colorClass="text-expense" />
        <StatCard label={t("netSavings")} value={formatMoney(BigInt(cur.net))} change={netChange.pct} up={netChange.up} />
        <StatCard label={t("savingsRate")} value={`${savingsRate}%`} change="+৫%" up />
      </div>

      {/* Wallets */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("wallets")}</h2>
          <Link href="/wallets" className="text-sm font-medium text-primary">{t("viewAll")}</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1">
          {wallets.map((w) => (
            <Card key={w.wallet_id} className="min-w-40 snap-start">
              <CardContent className="p-4">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: w.color ?? "#10b981" }} />
                <p className="mt-2 font-semibold">{w.name}</p>
                <p className="tabular text-lg font-bold">{formatMoney(w.balance)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("spendingByCategory")}</CardTitle></CardHeader>
          <CardContent><CategoryDonut data={summary?.by_category ?? []} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("incomeVsExpense")}</CardTitle></CardHeader>
          <CardContent><MonthlyBarChart data={trend} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("dailyTrend")}</CardTitle></CardHeader>
        <CardContent><DailyAreaChart data={summary?.daily ?? []} /></CardContent>
      </Card>

      {/* Budget + Upcoming + Debts + Goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("budgetProgress")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {budgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets this month</p>}
            {budgets.map((b) => {
              const pct = b.budget_amount > BigInt(0) ? Number(BigInt(b.spent) * BigInt(100) / BigInt(b.budget_amount)) : 0;
              const color = pct >= 100 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-income";
              return (
                <div key={b.budget_id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{b.category_id ? (b.categories as { name_bn: string } | null)?.name_bn ?? "Category" : "Overall"}</span>
                    <span className="tabular">{formatMoney(BigInt(b.spent))} / {formatMoney(BigInt(b.budget_amount))} ({pct}%)</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className={color} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("upcomingBills")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming bills (next 7 days)</p>}
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="text-sm font-semibold">{(r.categories as { name_bn: string } | null)?.name_bn ?? r.note ?? "Recurring"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.next_run_at)} • {(r.wallets as { name: string } | null)?.name}</p>
                </div>
                <span className="tabular font-bold">{formatMoney(BigInt(r.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("debtsSummary")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-income/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("toReceive")} (পাওনা)</p>
              <p className="tabular mt-1 text-xl font-bold text-income">{formatMoney(debts.toReceive)}</p>
            </div>
            <div className="rounded-2xl bg-expense/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("toPay")} (দেনা)</p>
              <p className="tabular mt-1 text-xl font-bold text-expense">{formatMoney(debts.toPay)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("savingsGoals")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 && <p className="text-sm text-muted-foreground">No active goals</p>}
            {goals.map((g) => {
              const pct = g.target_amount > BigInt(0) ? Number(g.saved * BigInt(100) / BigInt(g.target_amount)) : 0;
              return (
                <div key={g.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="tabular">{formatMoney(g.saved)} / {formatMoney(BigInt(g.target_amount))} ({pct}%)</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} />
                  {g.deadline && <p className="mt-1 text-xs text-muted-foreground">Deadline: {formatDate(g.deadline)}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent */}
      <section>
        <h2 className="mb-3 font-semibold">{t("recentTransactions")}</h2>
        {recent.length === 0 ? (
          <EmptyState title="No transactions yet" description="Add your first expense or income from the + button, or press N." />
        ) : (
          <div className="space-y-5">
            {Array.from(groupedRecent.entries()).map(([day, txs]) => (
              <div key={day}>
                <h3 className="mb-2 text-sm font-semibold">{formatDate(day, "bn", "dd MMMM yyyy")}</h3>
                <div className="space-y-2">
                  {txs.map((tx) => <TransactionRow key={tx.id} tx={tx as never} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
