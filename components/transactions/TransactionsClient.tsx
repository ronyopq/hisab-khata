"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TransactionRow, type TxRowData } from "./TransactionRow";
import { FilterSheet } from "./FilterSheet";
import { EmptyState } from "@/components/layout/EmptyState";
import { formatMoney } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { bulkDeleteTransactions, bulkRecategorize } from "@/lib/actions/transactions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { TxFilters } from "@/lib/queries/transactions";

/** TxFilters ⇄ URL query string, so filters survive reloads and are shareable. */
function filtersToParams(filters: TxFilters, base: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const key of ["type", "categoryId", "walletId", "tag", "from", "to", "sort"]) {
    const value = filters[key as keyof TxFilters];
    if (value) params.set(key, String(value));
    else params.delete(key);
  }
  return params;
}

function paramsToFilters(params: URLSearchParams): TxFilters {
  const filters: TxFilters = {};
  const type = params.get("type");
  if (type === "income" || type === "expense" || type === "transfer") filters.type = type;
  const categoryId = params.get("categoryId");
  if (categoryId) filters.categoryId = categoryId;
  const walletId = params.get("walletId");
  if (walletId) filters.walletId = walletId;
  const tag = params.get("tag");
  if (tag) filters.tag = tag;
  const from = params.get("from");
  if (from) filters.from = from;
  const to = params.get("to");
  if (to) filters.to = to;
  const sort = params.get("sort");
  if (sort === "newest" || sort === "oldest" || sort === "highest" || sort === "lowest") {
    filters.sort = sort;
  }
  return filters;
}

export function TransactionsClient({
  initial,
  wallets,
  categories,
  total,
  page,
  pageSize,
}: {
  initial: TxRowData[];
  wallets: { id: string; name: string }[];
  categories: { id: string; name_bn: string }[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filters = paramsToFilters(new URLSearchParams(searchParams.toString()));

  const activeFilterCount = Object.keys(filters).length;

  const applyFilters = (next: TxFilters) => {
    const params = filtersToParams(next, new URLSearchParams(searchParams.toString()));
    // A new filter set starts from the first page again.
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 0) params.delete("page");
    else params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Plain derivation: the list is already server-filtered and capped at 50 rows,
  // and React Compiler handles memoization better than a manual useMemo here.
  const grouped = (() => {
    const map = new Map<string, { txs: TxRowData[]; net: bigint }>();
    for (const tx of initial) {
      const day = tx.occurred_at.slice(0, 10);
      if (!map.has(day)) map.set(day, { txs: [], net: BigInt(0) });
      const g = map.get(day)!;
      g.txs.push(tx);
      const amt = typeof tx.amount === "bigint" ? tx.amount : BigInt(tx.amount);
      g.net += tx.type === "income" ? amt : tx.type === "expense" ? -amt : BigInt(0);
    }
    return Array.from(map.entries()).sort((a, b) =>
      filters.sort === "oldest" ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])
    );
  })();

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteTransactions(Array.from(selected));
      toast.success(`${selected.size} deleted`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleBulkRecategorize = async (categoryId: string) => {
    try {
      await bulkRecategorize(Array.from(selected), categoryId);
      toast.success("Recategorized");
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const hasPrev = page > 0;
  const hasNext = (page + 1) * pageSize < total;
  const sheet = (
    <FilterSheet
      open={filterOpen}
      onOpenChange={setFilterOpen}
      filters={filters}
      onApply={applyFilters}
      wallets={wallets}
      categories={categories}
    />
  );

  if (initial.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {activeFilterCount > 0 ? `${activeFilterCount} filter(s) active` : ""}
          </p>
          <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
            {t("filter")}
          </Button>
        </div>
        <EmptyState
          title={activeFilterCount > 0 ? "No matching transactions" : t("empty")}
          description={activeFilterCount > 0 ? "Try clearing a filter." : t("emptyCta")}
          actionLabel={activeFilterCount > 0 ? "Clear filters" : undefined}
          onAction={activeFilterCount > 0 ? () => applyFilters({}) : undefined}
        />
        {sheet}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "transaction" : "transactions"}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter(s)` : ""}
        </p>
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => applyFilters({})}>
              Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
            {t("filter")}
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2 shadow-lg">
          <span className="px-2 text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <select
            onChange={(e) => e.target.value && handleBulkRecategorize(e.target.value)}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
            defaultValue=""
          >
            <option value="">Recategorize...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_bn}</option>
            ))}
          </select>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {grouped.map(([day, g]) => (
        <section key={day}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{formatDate(day, "bn", "dd MMMM yyyy, EEEE")}</h2>
            <span className={`tabular text-sm font-bold ${g.net >= BigInt(0) ? "text-income" : "text-expense"}`}>
              {t("dailyNet")}: {formatMoney(g.net, { showSign: true, type: g.net >= BigInt(0) ? "income" : "expense" })}
            </span>
          </div>
          <div className="space-y-2">
            {g.txs.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} selected={selected.has(tx.id)} onSelect={toggleSelect} />
            ))}
          </div>
        </section>
      ))}

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => goToPage(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => goToPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {sheet}
    </div>
  );
}
