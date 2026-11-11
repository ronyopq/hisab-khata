"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  PiggyBank,
  Repeat,
  HandCoins,
  Target,
  BarChart3,
  BookOpen,
  Settings,
  LifeBuoy,
  Shield,
  ChevronLeft,
  ChevronRight,
  BookOpenCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, key: "transactions" },
  { href: "/wallets", icon: Wallet, key: "wallets" },
  { href: "/categories", icon: Tags, key: "categories" },
  { href: "/budgets", icon: PiggyBank, key: "budgets" },
  { href: "/recurring", icon: Repeat, key: "recurring" },
  { href: "/loans", icon: HandCoins, key: "loans" },
  { href: "/goals", icon: Target, key: "goals" },
  { href: "/reports", icon: BarChart3, key: "reports" },
];

const secondaryNav = [
  { href: "/books", icon: BookOpen, key: "books" },
  { href: "/settings", icon: Settings, key: "settings" },
  { href: "/admin", icon: Shield, key: "admin" },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const renderItem = (item: (typeof mainNav)[number]) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    const label = t(item.key as never);

    const content = (
      <>
        {isActive && (
          <motion.span
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          />
        )}
        <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </>
    );

    const link = (
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-11",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        {content}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.href}>{link}</div>;
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 sticky top-0 h-dvh",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <span className="font-bold text-base leading-tight">
              হিসাব খাতা
              <span className="block text-[10px] font-medium text-muted-foreground">Hisab Khata</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenCheck className="h-5 w-5" />
          </span>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <TooltipProvider>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNav.map(renderItem)}
          {!collapsed && <div className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">General</div>}
          {secondaryNav.map(renderItem)}
        </nav>
      </TooltipProvider>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground min-h-11",
            collapsed && "justify-center px-0"
          )}
        >
          <LifeBuoy className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t("help")}</span>}
        </Link>
      </div>
    </aside>
  );
}
