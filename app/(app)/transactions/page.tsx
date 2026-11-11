import { getTranslations } from "next-intl/server";
import { getTransactions } from "@/lib/queries/transactions";
import { getWalletsWithMeta } from "@/lib/queries/wallets";
import { getCategories } from "@/lib/queries/categories";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const t = await getTranslations("transactions");
  const params = await searchParams;
  const { data } = await getTransactions(0, 50, { search: params.q, type: params.type as never });
  const [wallets, categories] = await Promise.all([getWalletsWithMeta(), getCategories()]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form className="flex gap-2" action="/transactions" method="get">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder={t("searchPlaceholder")} className="pl-9" />
        </div>
        <Button type="submit" variant="outline" size="icon" aria-label={t("filter")}><SlidersHorizontal className="h-5 w-5" /></Button>
      </form>
      <TransactionsClient initial={data as never} wallets={wallets as never} categories={categories as never} />
    </div>
  );
}
