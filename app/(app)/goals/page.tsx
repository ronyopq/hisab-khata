import { getTranslations } from "next-intl/server";
import { getGoals } from "@/lib/queries/goals";
import { formatMoney } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GoalForm, ContributionForm } from "@/components/goals/GoalForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function GoalsPage() {
  const t = await getTranslations("nav");
  const p = await getTranslations("pages.goals");
  const { goals, generatedAt } = await getGoals();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("goals")}</h1>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {p("add")}</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{p("newTitle")}</DialogTitle></DialogHeader><GoalForm /></DialogContent>
        </Dialog>
      </div>
      {goals.length === 0 ? (
        <EmptyState
          title={p("emptyTitle")}
          description={p("emptyDesc")}
          actionSlot={
            <Dialog>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {p("add")}</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{p("newTitle")}</DialogTitle></DialogHeader><GoalForm /></DialogContent>
            </Dialog>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = g.target_amount > BigInt(0) ? Number(g.saved * BigInt(100) / BigInt(g.target_amount)) : 0;
            const monthsLeft = g.deadline ? Math.max(1, Math.ceil((new Date(g.deadline).getTime() - new Date(generatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))) : null;
            const monthlyReq = monthsLeft ? (BigInt(g.target_amount) - g.saved) / BigInt(monthsLeft) : null;
            return (
              <Card key={g.id}>
                <CardContent className="p-5">
                  <p className="font-semibold">{g.name}</p>
                  <p className="tabular mt-1 text-xl font-bold">{formatMoney(g.saved)} <span className="text-sm font-normal text-muted-foreground">/ {formatMoney(BigInt(g.target_amount))}</span></p>
                  <Progress value={Math.min(pct, 100)} className="mt-3" />
                  <p className="mt-2 text-xs text-muted-foreground">{pct}% {g.deadline ? `• Deadline ${formatDate(g.deadline)}` : ""} {monthlyReq ? `• ${formatMoney(monthlyReq)}/month needed` : ""}</p>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" className="mt-3">Add Contribution</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Contribution</DialogTitle></DialogHeader><ContributionForm goalId={g.id} /></DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
