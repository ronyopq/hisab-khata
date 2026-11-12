"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWallet } from "@/lib/actions/wallets";
import { WALLET_PRESETS } from "@/lib/wallets/presets";
import { parseMoneyToPaisa } from "@/lib/format/money";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["cash", "bank", "mobile_banking", "card", "savings", "other"]),
  provider: z.string().optional().default(""),
  opening: z.string().default("0"),
});

export function WalletForm({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) as never, defaultValues: { name: "", type: "cash", provider: "", opening: "0" } });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const paisa = parseMoneyToPaisa(data.opening) ?? BigInt(0);
      await createWallet({ name: data.name, type: data.type, provider: data.provider || undefined, openingBalancePaisa: paisa });
      toast.success("Wallet created");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Presets</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {WALLET_PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => { form.setValue("name", p.name); form.setValue("type", p.type); if (p.provider) form.setValue("provider", p.provider); }} className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-accent min-h-9">
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2"><Label>Name</Label><Input {...form.register("name")} placeholder="Cash / bKash / Bank" /></div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={form.watch("type")} onValueChange={(v: string) => form.setValue("type", v as never)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Provider (bKash, Nagad, Rocket, Upay, bank name)</Label><Input {...form.register("provider")} /></div>
      <div className="space-y-2"><Label>Opening Balance (৳)</Label><Input {...form.register("opening")} inputMode="decimal" placeholder="0" /></div>
      <Button className="w-full" disabled={loading}>{loading ? "Saving..." : "Create Wallet"}</Button>
    </form>
  );
}
