import { getTranslations } from "next-intl/server";
import { getBudgets } from "@/lib/queries/budgets";
import { getCategories } from "@/lib/queries/categories";
import { formatMoney } from "@/lib/format/money";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function BudgetsPage() {
  const t = await getTranslations("nav");
  const [budgets, categories] = await Promise.all([getBudgets(), getCategories("expense")]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("budgets")}</h1>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Budget</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>New Budget</DialogTitle></DialogHeader><BudgetForm categories={categories as never} /></DialogContent>
        </Dialog>
      </div>
      {budgets.length === 0 ? (
        <EmptyState title="No budgets" description="Set monthly overall or per-category budgets with 80%/100% alerts." actionLabel="Add Budget" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {budgets.map((b) => {
            const pct = b.budget_amount > BigInt(0) ? Number(BigInt(b.spent) * BigInt(100) / BigInt(b.budget_amount)) : 0;
            const color = pct >= 100 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-income";
            return (
              <Card key={b.budget_id}>
                <CardContent className="p-5">
                  <p className="font-semibold">{b.category_id ? (b.categories as { name_bn: string } | null)?.name_bn ?? "Category" : "Overall"}</p>
                  <p className="tabular mt-1 text-xl font-bold">{formatMoney(BigInt(b.spent))} <span className="text-sm font-normal text-muted-foreground">/ {formatMoney(BigInt(b.budget_amount))}</span></p>
                  <Progress value={Math.min(pct, 100)} className={`mt-3 ${color}`} />
                  <p className="mt-2 text-xs text-muted-foreground">{pct}% used {b.rollover ? "• Rollover on" : ""}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
