"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { QuickAddSheet } from "./QuickAddSheet";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SyncManager } from "@/components/pwa/SyncManager";
import { CommandPalette } from "@/components/search/CommandPalette";
import { AppLockProvider } from "@/components/auth/AppLockProvider";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeBook, setActiveBook] = useState<string | undefined>(undefined);
  const [wallets, setWallets] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name_bn: string; name_en: string; type: string; icon: string | null; color: string | null }[]>([]);
  const [defaultWalletId, setDefaultWalletId] = useState<string | undefined>(undefined);
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_book_id, default_wallet_id, full_name, is_admin")
        .eq("id", user.id)
        .single();
      setUserName(profile?.full_name ?? user.email?.split("@")[0]);
      setIsAdmin(Boolean(profile?.is_admin));
      if (!profile?.active_book_id) return;
      setDefaultWalletId(profile.default_wallet_id ?? undefined);
      setActiveBook(profile.active_book_id);
      const [{ data: w }, { data: c }] = await Promise.all([
        supabase.from("wallets").select("id, name").eq("book_id", profile.active_book_id).eq("is_archived", false).order("sort_order"),
        supabase.from("categories").select("id, name_bn, name_en, type, icon, color").eq("book_id", profile.active_book_id).eq("is_archived", false).order("sort_order"),
      ]);
      setWallets(w ?? []);
      setCategories(c ?? []);
    })();
  }, []);

  // PWA manifest shortcuts open /dashboard?add=expense|income. That parameter
  // used to be ignored, so the shortcut just landed on the dashboard.
  // Derived during render instead of an effect: no cascading re-render, and the
  // sheet is already open on the first paint after following the shortcut.
  const addParam = searchParams.get("add");
  const quickAddFromShortcut =
    addParam === "expense" || addParam === "income" || addParam === "transfer";
  const sheetOpen = quickAddOpen || quickAddFromShortcut;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      } else if (!isInput && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setQuickAddOpen(true);
      } else if (!isInput && e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-dvh bg-background">
      <OfflineBanner />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={userName}
          activeBookId={activeBook}
          hideAmounts={hideAmounts}
          onToggleHide={() => setHideAmounts((h) => !h)}
          onSearchClick={() => setCommandOpen(true)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-4 lg:pb-8 lg:px-6">{children}</main>
      </div>
      <BottomNav onFabClick={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={sheetOpen} onOpenChange={setQuickAddOpen} wallets={wallets} categories={categories} defaultWalletId={defaultWalletId} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <InstallPrompt />
      <SyncManager />
      <AppLockProvider />
    </div>
  );
}
