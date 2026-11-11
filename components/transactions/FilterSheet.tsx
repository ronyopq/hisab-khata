"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TxFilters } from "@/lib/queries/transactions";

export function FilterSheet({ open, onOpenChange, filters, onApply, wallets, categories }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: TxFilters;
  onApply: (f: TxFilters) => void;
  wallets: { id: string; name: string }[];
  categories: { id: string; name_bn: string }[];
}) {
  const [local, setLocal] = useState<TxFilters>(filters);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-background p-5 max-h-[85dvh] overflow-y-auto safe-bottom">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
          <Drawer.Title className="text-center font-semibold">Filter</Drawer.Title>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={local.type ?? "all"} onValueChange={(v: string) => setLocal({ ...local, type: v === "all" ? undefined : (v as never) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={local.categoryId ?? "all"} onValueChange={(v: string) => setLocal({ ...local, categoryId: v === "all" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_bn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wallet</Label>
              <Select value={local.walletId ?? "all"} onValueChange={(v: string) => setLocal({ ...local, walletId: v === "all" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>From</Label><Input type="date" value={local.from ?? ""} onChange={(e) => setLocal({ ...local, from: e.target.value || undefined })} /></div>
              <div className="space-y-2"><Label>To</Label><Input type="date" value={local.to ?? ""} onChange={(e) => setLocal({ ...local, to: e.target.value || undefined })} /></div>
            </div>
            <div className="space-y-2"><Label>Tag</Label><Input value={local.tag ?? ""} onChange={(e) => setLocal({ ...local, tag: e.target.value || undefined })} placeholder="e.g. eid" /></div>
            <div className="space-y-2">
              <Label>Sort</Label>
              <Select value={local.sort ?? "newest"} onValueChange={(v: string) => setLocal({ ...local, sort: v as never })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="highest">Highest amount</SelectItem><SelectItem value="lowest">Lowest amount</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setLocal({}); onApply({}); onOpenChange(false); }}>Clear</Button>
              <Button className="flex-1" onClick={() => { onApply(local); onOpenChange(false); }}>Apply</Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
