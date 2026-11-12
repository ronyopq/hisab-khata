import { getTranslations } from "next-intl/server";
import { getWallets } from "@/lib/queries/wallets";
import { formatMoney } from "@/lib/format/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletForm } from "@/components/wallets/WalletForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Archive, ArrowLeftRight } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function WalletsPage() {
  const t = await getTranslations("nav");
  const wallets = await getWallets();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("wallets")}</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Add Wallet</Button>
          </DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>New Wallet</DialogTitle></DialogHeader><WalletForm /></DialogContent>
        </Dialog>
      </div>

      {wallets.length === 0 ? (
        <EmptyState
          title="No wallets yet"
          description="Add Cash, Bank, bKash, Nagad, Rocket, Upay, Card or Savings."
          actionSlot={
            <Dialog>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4" /> Add Wallet</Button>
              </DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>New Wallet</DialogTitle></DialogHeader><WalletForm /></DialogContent>
            </Dialog>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <Card key={w.wallet_id} className={w.is_archived ? "opacity-60" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.type}{w.provider ? ` • ${w.provider}` : ""}</p>
                  </div>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: w.color ?? "#10b981" }} />
                </div>
                <p className="tabular mt-3 text-2xl font-bold">{formatMoney(w.balance)}</p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline" className="gap-1"><ArrowLeftRight className="h-3 w-3" /> Transfer</Badge>
                  {w.is_archived && <Badge variant="secondary">Archived</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
