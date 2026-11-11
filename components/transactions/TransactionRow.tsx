"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatMoney } from "@/lib/format/money";
import { DynamicIcon } from "@/components/forms/IconPicker";
import { Badge } from "@/components/ui/badge";
import { softDeleteTransaction, duplicateTransaction } from "@/lib/actions/transactions";
import { toast } from "sonner";
import { Pencil, Trash2, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface TxRowData {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string | bigint;
  occurred_at: string;
  note: string | null;
  payee: string | null;
  tags: string[];
  categories?: { name_bn: string; name_en: string; icon: string | null; color: string | null } | null;
  wallets?: { name: string } | null;
}

export function TransactionRow({ tx, selected, onSelect, onEdit }: { tx: TxRowData; selected?: boolean; onSelect?: (id: string, checked: boolean) => void; onEdit?: (tx: TxRowData) => void }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [longPress, setLongPress] = useState(false);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  const amount = typeof tx.amount === "bigint" ? tx.amount : BigInt(tx.amount);
  const catName = tx.categories ? tx.categories.name_bn : tx.type === "transfer" ? "ট্রান্সফার" : "—";

  const handleDelete = async () => {
    try {
      await softDeleteTransaction(tx.id);
      toast.success("Deleted", {
        action: { label: "Undo", onClick: async () => {
          const { restoreTransaction } = await import("@/lib/actions/transactions");
          await restoreTransaction(tx.id);
        }},
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateTransaction(tx.id);
      toast.success("Duplicated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={() => { pressTimer = setTimeout(() => { setLongPress(true); navigator.vibrate?.(15); }, 500); }}
      onTouchEnd={() => { if (pressTimer) clearTimeout(pressTimer); }}
      onMouseDown={() => { pressTimer = setTimeout(() => setLongPress(true), 500); }}
      onMouseUp={() => { if (pressTimer) clearTimeout(pressTimer); }}
    >
      {/* Swipe actions */}
      <div className="absolute inset-0 flex items-center justify-end gap-2 pr-4 bg-destructive/10">
        <button onClick={() => onEdit?.(tx)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-label="Edit"><Pencil className="h-5 w-5" /></button>
        <button onClick={handleDuplicate} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary" aria-label="Duplicate"><Copy className="h-5 w-5" /></button>
        <button onClick={handleDelete} className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive text-white" aria-label="Delete"><Trash2 className="h-5 w-5" /></button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => { if (info.offset.x < -80) setDragX(-140); else setDragX(0); }}
        animate={{ x: dragX }}
        className={cn("relative flex items-center gap-3 rounded-2xl border bg-card p-3", selected && "border-primary bg-primary/5")}
      >
        {longPress && onSelect && (
          <Checkbox checked={selected} onCheckedChange={(c: boolean) => onSelect(tx.id, !!c)} />
        )}
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${tx.categories?.color ?? "#10b981"}20`, color: tx.categories?.color ?? "#10b981" }}
        >
          <DynamicIcon name={tx.categories?.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{tx.payee || tx.note || catName}</p>
          <p className="truncate text-xs text-muted-foreground">{catName} • {tx.wallets?.name ?? ""}</p>
          {tx.tags?.length > 0 && (
            <div className="mt-1 flex gap-1">{tx.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
          )}
        </div>
        <p className={cn("tabular shrink-0 text-base font-bold", tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "text-transfer")}>
          {formatMoney(amount, { showSign: true, type: tx.type })}
        </p>
      </motion.div>
    </div>
  );
}
