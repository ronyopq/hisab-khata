"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Home, ArrowLeftRight, Plus, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", icon: Home, key: "home" },
  { href: "/transactions", icon: ArrowLeftRight, key: "transactions" },
  { href: "/reports", icon: BarChart3, key: "reports" },
  { href: "/more", icon: MoreHorizontal, key: "more" },
];

export function BottomNav({ onFabClick }: { onFabClick: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass border-t safe-bottom">
      <div className="relative mx-auto flex max-w-md items-end justify-between px-4 pb-2 pt-1">
        {tabs.slice(0, 2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl"
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-pill"
                  className="absolute inset-x-3 top-1 bottom-1 rounded-full bg-primary/12"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <motion.span
                animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <Icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
              </motion.span>
              <span className={cn("relative z-10 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {t(tab.key as never)}
              </span>
            </Link>
          );
        })}

        {/* Center FAB */}
        <div className="relative -top-5 flex flex-col items-center">
          <motion.button
            onClick={() => {
              navigator.vibrate?.(10);
              onFabClick();
            }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            aria-label="Add transaction"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-4 border-background"
          >
            <Plus className="h-7 w-7" />
          </motion.button>
        </div>

        {tabs.slice(2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl"
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-pill"
                  className="absolute inset-x-3 top-1 bottom-1 rounded-full bg-primary/12"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <motion.span
                animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <Icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
              </motion.span>
              <span className={cn("relative z-10 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {t(tab.key as never)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
