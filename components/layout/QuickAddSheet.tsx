"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Drawer } from "vaul";
import { motion } from "motion/react";
import { Delete, Camera, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction } from "@/lib/actions/transactions";
import { parseMoneyToPaisa, formatMoney } from "@/lib/format/money";
import { DynamicIcon } from "@/components/forms/IconPicker";
import { toast } from "sonner";

type TxType = "expense" | "income" | "transfer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: { id: string; name: string }[];
  categories: { id: string; name_bn: string; name_en: string; type: string; icon: string | null; color: string | null }[];
  defaultWalletId?: string;
}

export function QuickAddSheet({ open, onOpenChange, wallets, categories, defaultWalletId }: Props) {
  const t = useTranslations("quickAdd");
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState(defaultWalletId ?? "");
  const [toWalletId, setToWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !walletId && wallets.length) setWalletId(defaultWalletId ?? wallets[0].id);
  }, [open, wallets, defaultWalletId, walletId]);

  const filteredCats = categories.filter((c) => c.type === type);

  const press = (key: string) => {
    navigator.vibrate?.(5);
    if (key === "back") setAmount((a) => a.slice(0, -1));
    else if (key === ".") {
      if (!amount.includes(".")) setAmount((a) => (a ? a + "." : "0."));
    } else setAmount((a) => (a.length < 12 ? a + key : a));
  };

  const handleSave = async () => {
    const paisa = parseMoneyToPaisa(amount);
    if (!paisa || paisa <= BigInt(0)) { toast.error("Enter amount"); return; }
    if (!walletId) { toast.error("Select wallet"); return; }
    if (type === "transfer" && (!toWalletId || toWalletId === walletId)) { toast.error("Select destination wallet"); return; }
    if (type !== "transfer" && !categoryId) { toast.error("Select category"); return; }
    setLoading(true);
    try {
      await createTransaction({
        type,
        amountPaisa: paisa,
        walletId,
        toWalletId: type === "transfer" ? toWalletId : undefined,
        categoryId: type === "transfer" ? null : categoryId,
        occurredAt: new Date(date + "T12:00:00"),
        note: note || undefined,
        tags: [],
      });
      setSaved(true);
      navigator.vibrate?.([10, 50, 10]);
      toast.success(t("saved"));
      setTimeout(() => {
        setSaved(false);
        setAmount("");
        setNote("");
        onOpenChange(false);
      }, 900);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-background border-t shadow-2xl max-h-[92dvh] overflow-y-auto safe-bottom">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" />
          <div className="p-5 pb-6">
            <div className="flex items-center justify-between">
              <Drawer.Title className="text-base font-semibold">{t("title")}</Drawer.Title>
              <button onClick={() => onOpenChange(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
              {(["expense", "income", "transfer"] as TxType[]).map((k) => (
                <button key={k} onClick={() => setType(k)} className={cn("relative min-h-11 rounded-xl text-sm font-semibold", type === k ? "text-foreground" : "text-muted-foreground")}>
                  {type === k && <motion.span layoutId="quickadd-seg" className="absolute inset-0 rounded-xl bg-background shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
                  <span className="relative z-10">{t(k)}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("amount")}</p>
              <p className="tabular mt-1 text-5xl font-bold tracking-tight">৳ <span className={cn(!amount && "text-muted-foreground/40")}>{amount || "0"}</span></p>
            </div>

            {type !== "transfer" && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">{t("category")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCats.slice(0, 8).map((c) => (
                    <button key={c.id} onClick={() => setCategoryId(c.id)} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition-all active:scale-95", categoryId === c.id ? "border-primary bg-primary/10 text-primary" : "bg-muted/50")}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background" style={{ color: c.color ?? undefined }}><DynamicIcon name={c.icon} className="h-4 w-4" /></span>
                      <span className="px-1 text-center leading-tight">{c.name_bn}</span>
                    </button>
                  ))}
                </div>
                {filteredCats.length > 8 && (
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="More categories..." /></SelectTrigger>
                    <SelectContent>{filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_bn} / {c.name_en}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>{type === "transfer" ? t("fromWallet") : t("wallet")}</Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                  <SelectContent>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {type === "transfer" && (
                <div className="space-y-2">
                  <Label>{t("toWallet")}</Label>
                  <Select value={toWalletId} onValueChange={setToWalletId}>
                    <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent>{wallets.filter((w) => w.id !== walletId).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>{t("date")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} /></div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {keys.map((k) => (
                <button key={k} onClick={() => press(k)} aria-label={k === "back" ? "Delete" : k} className="flex min-h-14 items-center justify-center rounded-2xl bg-muted/60 text-2xl font-semibold tabular transition-all active:scale-95 active:bg-muted">
                  {k === "back" ? <Delete className="h-6 w-6" /> : k}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" aria-label={t("attachment")}><Camera className="h-5 w-5" /></Button>
              <Button className="h-12 flex-1 text-base" onClick={handleSave} disabled={loading || !amount}>
                {saved ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2"><Check className="h-5 w-5" /> {t("saved")}</motion.span> : loading ? "Saving..." : t("save")}
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
