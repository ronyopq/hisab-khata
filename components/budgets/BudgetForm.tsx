"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createBudget } from "@/lib/actions/budgets";
import { parseMoneyToPaisa } from "@/lib/format/money";
import { toast } from "sonner";

export function BudgetForm({ categories, onDone }: { categories: { id: string; name_bn: string }[]; onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("overall");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rollover, setRollover] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseMoneyToPaisa(amount);
    if (!paisa) { toast.error("Enter amount"); return; }
    setLoading(true);
    try {
      await createBudget({ categoryId: categoryId === "overall" ? null : categoryId, amountPaisa: paisa, month: month + "-01", rollover });
      toast.success("Budget created");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="overall">Overall / সামগ্রিক</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_bn}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Amount (৳)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="20000" /></div>
      <div className="space-y-2"><Label>Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      <div className="flex items-center justify-between"><Label>Rollover (carry unused)</Label><Switch checked={rollover} onCheckedChange={setRollover} /></div>
      <Button className="w-full" disabled={loading}>{loading ? "Saving..." : "Create Budget"}</Button>
    </form>
  );
}
