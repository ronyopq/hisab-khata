"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContact, createDebt, addDebtPayment } from "@/lib/actions/loans";
import { parseMoneyToPaisa } from "@/lib/format/money";
import { toast } from "sonner";

export function ContactForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createContact({ name, phone: phone || undefined }); toast.success("Contact added"); onDone?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <Button className="w-full">Add Contact</Button>
    </form>
  );
}

export function DebtForm({ contacts, wallets, onDone }: { contacts: { id: string; name: string }[]; wallets: { id: string; name: string }[]; onDone?: () => void }) {
  const [contactId, setContactId] = useState("");
  const [direction, setDirection] = useState<"lent" | "borrowed">("lent");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseMoneyToPaisa(amount);
    if (!paisa || !contactId) { toast.error("Fill required"); return; }
    try {
      await createDebt({ contactId, direction, amountPaisa: paisa, walletId: walletId || null, issuedAt: new Date(), dueAt: dueAt ? new Date(dueAt) : null });
      toast.success("Debt added");
      onDone?.();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Contact</Label><Select value={contactId} onValueChange={setContactId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Direction</Label><Select value={direction} onValueChange={(v: string) => setDirection(v as never)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lent">Lent (পাওনা)</SelectItem><SelectItem value="borrowed">Borrowed (দেনা)</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Amount (৳)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
      <div className="space-y-2"><Label>Wallet (optional)</Label><Select value={walletId} onValueChange={setWalletId}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
      <Button className="w-full">Add Debt</Button>
    </form>
  );
}

export function PaymentForm({ debtId, onDone }: { debtId: string; onDone?: () => void }) {
  const [amount, setAmount] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseMoneyToPaisa(amount);
    if (!paisa) return;
    try { await addDebtPayment({ debtId, amountPaisa: paisa, paidAt: new Date() }); toast.success("Payment added"); onDone?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Amount (৳)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
      <Button className="w-full">Add Payment</Button>
    </form>
  );
}
