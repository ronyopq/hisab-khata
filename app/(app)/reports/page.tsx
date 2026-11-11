import { getTranslations } from "next-intl/server";
import { getReportData, getAllTransactionsForExport } from "@/lib/queries/reports";
import { getWalletsWithMeta } from "@/lib/queries/wallets";
import { getCategories } from "@/lib/queries/categories";
import { formatMoney } from "@/lib/format/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { MonthlyBarChart } from "@/components/charts/TrendCharts";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { ImportWizard } from "@/components/reports/ImportWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const t = await getTranslations("nav");
  const params = await searchParams;
  const period = (params.period as "thisMonth" | "lastMonth" | "thisYear" | "custom") ?? "thisMonth";
  const [report, allTx, wallets, categories] = await Promise.all([
    getReportData(period),
    getAllTransactionsForExport(),
    getWalletsWithMeta(),
    getCategories(),
  ]);

  const summary = report?.summary;
  const exportRows = allTx.map((tx) => ({
    date: tx.occurred_at,
    type: tx.type,
    amount_taka: Number(BigInt(tx.amount)) / 100,
    category: (tx.categories as { name_bn: string } | null)?.name_bn ?? "",
    wallet: (tx.wallets as { name: string } | null)?.name ?? "",
    note: tx.note ?? "",
    payee: tx.payee ?? "",
  }));

  return (
    <div className="space-y-5 print:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("reports")}</h1>
        <div className="flex gap-2 print:hidden">
          <ExportButtons rows={exportRows} />
          <Dialog>
            <DialogTrigger asChild><Button variant="outline"><Upload className="h-4 w-4" /> Import CSV</Button></DialogTrigger>
            <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Import CSV</DialogTitle></DialogHeader><ImportWizard wallets={wallets as never} categories={categories as never} /></DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar print:hidden">
        {([["thisMonth", "This Month"], ["lastMonth", "Last Month"], ["thisYear", "This Year"]] as const).map(([key, label]) => (
          <Link key={key} href={`/reports?period=${key}`} className={period === key ? "shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground min-h-10" : "shrink-0 rounded-full border px-4 py-2 text-sm font-medium min-h-10"}>
            {label}
          </Link>
        ))}
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Income", value: summary ? formatMoney(BigInt(summary.current.income)) : "৳ 0", cls: "text-income" },
          { label: "Expense", value: summary ? formatMoney(BigInt(summary.current.expense)) : "৳ 0", cls: "text-expense" },
          { label: "Net", value: summary ? formatMoney(BigInt(summary.current.net)) : "৳ 0", cls: "" },
          { label: "Transactions", value: String(allTx.length), cls: "" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`tabular mt-1 text-xl font-bold ${s.cls}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Category breakdown chart + table */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent><CategoryDonut data={summary?.by_category ?? []} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Category Table</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Category</th><th className="py-2 text-right">Amount</th></tr></thead>
                <tbody>
                  {(summary?.by_category ?? []).map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{c.name_bn}</td>
                      <td className="tabular py-2 text-right font-semibold">{formatMoney(BigInt(c.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend + cash flow */}
      <Card>
        <CardHeader><CardTitle>Monthly Trend & Cash Flow (12 months)</CardTitle></CardHeader>
        <CardContent><MonthlyBarChart data={report?.trend ?? []} /></CardContent>
      </Card>

      {/* Wallet-wise */}
      <Card>
        <CardHeader><CardTitle>Wallet-wise Report</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(report?.wallets ?? []).map((w) => (
              <div key={w.wallet_id} className="rounded-2xl border p-4">
                <p className="font-semibold">{w.name}</p>
                <p className="tabular text-lg font-bold">{formatMoney(w.balance)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 10 expenses */}
      <Card>
        <CardHeader><CardTitle>Top 10 Expenses</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(report?.topExpenses ?? []).map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{tx.payee || tx.note || (tx.categories as { name_bn: string } | null)?.name_bn}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.occurred_at).toLocaleDateString("bn-BD")}</p>
                  </div>
                </div>
                <span className="tabular font-bold text-expense">{formatMoney(BigInt(tx.amount))}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Period comparison */}
      <Card>
        <CardHeader><CardTitle>Period Comparison</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-muted-foreground">Current Income</p><p className="tabular font-bold text-income">{summary ? formatMoney(BigInt(summary.current.income)) : "৳ 0"}</p></div>
            <div><p className="text-xs text-muted-foreground">Previous Income</p><p className="tabular font-bold">{summary ? formatMoney(BigInt(summary.previous.income)) : "৳ 0"}</p></div>
            <div><p className="text-xs text-muted-foreground">Current Expense</p><p className="tabular font-bold text-expense">{summary ? formatMoney(BigInt(summary.current.expense)) : "৳ 0"}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
