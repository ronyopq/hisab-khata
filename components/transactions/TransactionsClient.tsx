"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { TransactionRow, type TxRowData } from "./TransactionRow";
import { FilterSheet } from "./FilterSheet";
import { EmptyState } from "@/components/layout/EmptyState";
import { formatMoney } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { bulkDeleteTransactions, bulkRecategorize } from "@/lib/actions/transactions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Tag } from "lucide-react";
import type { TxFilters } from "@/lib/queries/transactions";

export function TransactionsClient({ initial, wallets, categories }: { initial: TxRowData[]; wallets: { id: string; name: string }[]; categories: { id: string; name_bn: string }[] }) {
  const t = useTranslations("transactions");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<TxFilters>({});

  const grouped = useMemo(() => {
    const map = new Map<string, { txs: TxRowData[]; net: bigint }>();
    for (const tx of initial) {
      const day = tx.occurred_at.slice(0, 10);
      if (!map.has(day)) map.set(day, { txs: [], net: BigInt(0) });
      const g = map.get(day)!;
      g.txs.push(tx);
      const amt = typeof tx.amount === "bigint" ? tx.amount : BigInt(tx.amount);
      g.net += tx.type === "income" ? amt : tx.type === "expense" ? -amt : BigInt(0);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [initial]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteTransactions(Array.from(selected));
      toast.success(`${selected.size} deleted`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleBulkRecategorize = async (categoryId: string) => {
    try {
      await bulkRecategorize(Array.from(selected), categoryId);
      toast.success("Recategorized");
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (initial.length === 0) {
    return (
      <>
        <EmptyState title={t("empty")} description={t("emptyCta")} actionLabel={t("emptyCta")} />
        <FilterSheet open={filterOpen} onOpenChange={setFilterOpen} filters={filters} onApply={setFilters} wallets={wallets} categories={categories} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-lg">
          <span className="px-2 text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="h-4 w-4" /> Delete</Button>
          <select onChange={(e) => e.target.value && handleBulkRecategorize(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" defaultValue="">
            <option value="">Recategorize...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
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

      <FilterSheet open={filterOpen} onOpenChange={setFilterOpen} filters={filters} onApply={setFilters} wallets={wallets} categories={categories} />
    </div>
  );
}
