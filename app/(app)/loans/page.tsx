import { getTranslations } from "next-intl/server";
import { getContacts, getDebts } from "@/lib/queries/loans";
import { getWalletsWithMeta } from "@/lib/queries/wallets";
import { formatMoney } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactForm, DebtForm, PaymentForm } from "@/components/loans/LoanForms";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function LoansPage() {
  const t = await getTranslations("nav");
  const [contacts, debts, wallets] = await Promise.all([getContacts(), getDebts(), getWalletsWithMeta()]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("loans")} (ধার-দেনা)</h1>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">Contact</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>New Contact</DialogTitle></DialogHeader><ContactForm /></DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Loan</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader><DebtForm contacts={contacts as never} wallets={wallets as never} /></DialogContent>
          </Dialog>
        </div>
      </div>

      {debts.length === 0 ? (
        <EmptyState
          title="No loans"
          description="Track পাওনা (lent) and দেনা (borrowed) with partial repayments."
          actionSlot={
            <Dialog>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Loan</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader><DebtForm contacts={contacts as never} wallets={wallets as never} /></DialogContent>
            </Dialog>
          }
        />
      ) : (
        <div className="space-y-3">
          {debts.map((d) => {
            const debt = (d.debts ?? d) as { id: string; direction: string; status: string; due_at: string | null; contacts?: { name: string } | null };
            const debtId = debt.id ?? d.debt_id;
            return (
              <Card key={debtId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{debt.contacts?.name ?? "Contact"}</p>
                      <p className="text-xs text-muted-foreground">{debt.direction === "lent" ? "পাওনা (Lent)" : "দেনা (Borrowed)"} {debt.due_at ? `• Due ${formatDate(debt.due_at)}` : ""}</p>
                    </div>
                    <Badge variant={debt.status === "settled" ? "secondary" : "default"}>{debt.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="tabular text-xl font-bold">{formatMoney(BigInt(d.remaining))}</p>
                      <p className="text-xs text-muted-foreground">Paid {formatMoney(BigInt(d.paid))} / {formatMoney(BigInt(d.principal))}</p>
                    </div>
                    {debt.status !== "settled" && (
                      <Dialog>
                        <DialogTrigger asChild><Button size="sm">Add Payment</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Repayment</DialogTitle></DialogHeader><PaymentForm debtId={debtId} /></DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
