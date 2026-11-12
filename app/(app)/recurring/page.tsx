import { getTranslations } from "next-intl/server";
import { getRecurring } from "@/lib/queries/recurring";
import { getWalletsWithMeta } from "@/lib/queries/wallets";
import { getCategories } from "@/lib/queries/categories";
import { formatMoney } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecurringForm } from "@/components/recurring/RecurringForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function RecurringPage() {
  const t = await getTranslations("nav");
  const p = await getTranslations("pages.recurring");
  const [rules, wallets, categories] = await Promise.all([getRecurring(), getWalletsWithMeta(), getCategories()]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("recurring")}</h1>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {p("add")}</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{p("newTitle")}</DialogTitle></DialogHeader><RecurringForm wallets={wallets as never} categories={categories as never} /></DialogContent>
        </Dialog>
      </div>
      {rules.length === 0 ? (
        <EmptyState
          title={p("emptyTitle")}
          description={p("emptyDesc")}
          actionSlot={
            <Dialog>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {p("add")}</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{p("newTitle")}</DialogTitle></DialogHeader><RecurringForm wallets={wallets as never} categories={categories as never} /></DialogContent>
            </Dialog>
          }
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{(r.categories as { name_bn: string } | null)?.name_bn ?? r.note ?? r.type}</p>
                  <p className="text-xs text-muted-foreground">{r.frequency} • Next: {formatDate(r.next_run_at)} • {(r.wallets as { name: string } | null)?.name}</p>
                  <div className="mt-1 flex gap-1"><Badge variant={r.mode === "auto_create" ? "default" : "secondary"}>{r.mode}</Badge>{!r.is_active && <Badge variant="outline">Paused</Badge>}</div>
                </div>
                <p className="tabular font-bold">{formatMoney(BigInt(r.amount))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
