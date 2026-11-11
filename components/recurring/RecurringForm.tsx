"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRecurring } from "@/lib/actions/recurring";
import { parseMoneyToPaisa } from "@/lib/format/money";
import { toast } from "sonner";

export function RecurringForm({ wallets, categories, onDone }: { wallets: { id: string; name: string }[]; categories: { id: string; name_bn: string }[]; onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [mode, setMode] = useState<"auto_create" | "remind_only">("remind_only");
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseMoneyToPaisa(amount);
    if (!paisa || !walletId) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await createRecurring({ type, amountPaisa: paisa, walletId, categoryId: categoryId || null, frequency, interval: 1, nextRunAt: new Date(nextRun + "T09:00:00"), mode });
      toast.success("Recurring created");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={(v: string) => setType(v as never)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Frequency</Label><Select value={frequency} onValueChange={(v: string) => setFrequency(v as never)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
      </div>
      <div className="space-y-2"><Label>Amount (৳)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
      <div className="space-y-2"><Label>Wallet</Label><Select value={walletId} onValueChange={setWalletId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Category</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_bn}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Next Run</Label><Input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} /></div>
        <div className="space-y-2"><Label>Mode</Label><Select value={mode} onValueChange={(v: string) => setMode(v as never)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto_create">Auto-create</SelectItem><SelectItem value="remind_only">Remind only</SelectItem></SelectContent></Select></div>
      </div>
      <Button className="w-full" disabled={loading}>{loading ? "Saving..." : "Create Recurring"}</Button>
    </form>
  );
}
