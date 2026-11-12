import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getTransactions } from "@/lib/queries/transactions";
import { getWalletsWithMeta } from "@/lib/queries/wallets";
import { getCategories } from "@/lib/queries/categories";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const PAGE_SIZE = 50;

type TransactionSearchParams = {
  q?: string;
  type?: string;
  categoryId?: string;
  walletId?: string;
  tag?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionSearchParams>;
}) {
  const t = await getTranslations("transactions");
  const params = await searchParams;

  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);
  const type =
    params.type === "income" || params.type === "expense" || params.type === "transfer"
      ? params.type
      : undefined;
  const sort =
    params.sort === "oldest" || params.sort === "highest" || params.sort === "lowest"
      ? params.sort
      : params.sort === "newest"
        ? "newest"
        : undefined;

  const { data, count } = await getTransactions(page, PAGE_SIZE, {
    search: params.q,
    type,
    categoryId: params.categoryId,
    walletId: params.walletId,
    tag: params.tag,
    from: params.from,
    to: params.to,
    sort,
  });

  const [wallets, categories] = await Promise.all([getWalletsWithMeta(), getCategories()]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {/* Plain GET form: works without JS and keeps every other filter in the URL. */}
      <form className="flex gap-2" action="/transactions" method="get">
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.categoryId && <input type="hidden" name="categoryId" value={params.categoryId} />}
        {params.walletId && <input type="hidden" name="walletId" value={params.walletId} />}
        {params.tag && <input type="hidden" name="tag" value={params.tag} />}
        {params.from && <input type="hidden" name="from" value={params.from} />}
        {params.to && <input type="hidden" name="to" value={params.to} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder={t("searchPlaceholder")} className="pl-9" />
        </div>
        <Button type="submit">{t("searchAction")}</Button>
      </form>
      <Suspense fallback={null}>
        <TransactionsClient
          initial={data as never}
          wallets={wallets as never}
          categories={(categories ?? []) as never}
          total={count}
          page={page}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    </div>
  );
}
