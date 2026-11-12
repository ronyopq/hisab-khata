"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowLeftRight, HandCoins } from "lucide-react";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

export function HeroBalance({ total, onQuickAction }: { total: string; onQuickAction?: (action: string) => void }) {
  const [hidden, setHidden] = useState(false);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => formatMoney(BigInt(Math.round(v))));

  useEffect(() => {
    mv.set(Number(total));
  }, [total, mv]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/80">মোট ব্যালেন্স / Total Balance</p>
        <button onClick={() => setHidden((h) => !h)} aria-label="Toggle amounts" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <motion.p className="tabular mt-2 text-4xl font-bold tracking-tight">
        {hidden ? "৳ ••••••" : <motion.span>{display}</motion.span>}
      </motion.p>
      <p className="mt-1 text-sm text-white/70">Across all wallets</p>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {[
          { icon: Plus, label: "ব্যয়", action: "expense" },
          { icon: ArrowUpRight, label: "আয়", action: "income" },
          { icon: ArrowLeftRight, label: "ট্রান্সফার", action: "transfer" },
          { icon: HandCoins, label: "ধার-দেনা", action: "loan" },
        ].map((a) => (
          <motion.button
            key={a.action}
            whileTap={{ scale: 0.94 }}
            onClick={() => onQuickAction?.(a.action)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-white/15 text-xs font-medium backdrop-blur"
          >
            <a.icon className="h-5 w-5" />
            <span>{a.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export function StatCard({ label, value, change, up, colorClass }: { label: string; value: string; change: string; up: boolean; colorClass?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("tabular mt-1 text-xl font-bold", colorClass)}>{value}</p>
      <p className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
        <span className={up ? "text-income" : "text-expense"}>{change}</span>
      </p>
    </motion.div>
  );
}

// pctChange moved to @/lib/format/money (server-safe) — import from there.
