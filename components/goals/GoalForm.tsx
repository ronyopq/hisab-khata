"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createGoal, addContribution } from "@/lib/actions/goals";
import { parseMoneyToPaisa } from "@/lib/format/money";
import { toast } from "sonner";

export function GoalForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseMoneyToPaisa(target);
    if (!paisa) return;
    try { await createGoal({ name, targetAmountPaisa: paisa, deadline: deadline || null }); toast.success("Goal created"); onDone?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Target (৳)</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" /></div>
      <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
      <Button className="w-full">Create Goal</Button>
    </form>
  );
}

export function ContributionForm({ goalId, onDone }: { goalId: string; onDone?: () => void }) {
  const [amount, setAmount] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseMoneyToPaisa(amount);
    if (!paisa) return;
    try { await addContribution({ goalId, amountPaisa: paisa, contributedAt: new Date() }); toast.success("Added"); onDone?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Amount (৳)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
      <Button className="w-full">Add Contribution</Button>
    </form>
  );
}
