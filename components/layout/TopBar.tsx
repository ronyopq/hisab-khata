"use client";

import { useTranslations } from "next-intl";
import { Bell, Search, Sun, Moon, Monitor, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getGreeting } from "@/lib/format/date";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setLocale } from "@/lib/i18n/actions";

export function TopBar({
  userName,
  activeBookId,
  hideAmounts,
  onToggleHide,
  onSearchClick,
}: {
  userName?: string;
  activeBookId?: string;
  hideAmounts?: boolean;
  onToggleHide?: () => void;
  onSearchClick?: () => void;
}) {
  const t = useTranslations("greeting");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isSwitchingLocale, startLocaleTransition] = useTransition();
  const [books, setBooks] = useState<{ id: string; name: string }[]>([]);
  const { theme, setTheme } = useTheme();
  const [greeting, setGreeting] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setGreeting(getGreeting());
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
      setUnread(count ?? 0);
      const { data: memberships } = await supabase
        .from("book_members")
        .select("book_id, books:book_id(name)")
        .eq("user_id", user.id);
      setBooks(
        (memberships ?? []).map((m) => ({
          id: m.book_id as string,
          name: ((m.books as unknown as { name: string } | null)?.name) ?? "—",
        }))
      );
    })();
  }, []);

  const switchBook = async (bookId: string) => {
    if (!bookId || bookId === activeBookId) return;
    const { switchActiveBook } = await import("@/lib/actions/books");
    await switchActiveBook(bookId);
    router.refresh();
  };

  const toggleLocale = () => {
    startLocaleTransition(async () => {
      await setLocale(locale === "bn" ? "en" : "bn");
      router.refresh();
    });
  };

  const currentBookName = books.find((b) => b.id === activeBookId)?.name;

  return (
    <header className="sticky top-0 z-30 glass border-b safe-top">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <div className="flex items-center gap-3 lg:hidden">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{(userName ?? tc("appName")).slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">{t(greeting)}</p>
            <p className="text-sm font-semibold">{userName ?? tc("appName")}</p>
          </div>
        </div>

        <button
          onClick={onSearchClick}
          className="hidden lg:flex h-10 w-80 items-center gap-2 rounded-xl border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search transactions, categories…</span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hidden sm:flex gap-1.5 max-w-[220px]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span className="truncate">{currentBookName ?? tc("appName")}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("switchBook")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {books.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => switchBook(b.id)}>
                  <span className={b.id === activeBookId ? "font-semibold" : undefined}>{b.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/books">{t("manageBooks")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex font-semibold"
            onClick={toggleLocale}
            disabled={isSwitchingLocale}
            aria-label={tc("language")}
          >
            {locale === "bn" ? "বাংলা" : "English"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : theme === "light" ? <Sun className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onToggleHide && (
            <Button variant="ghost" size="icon" onClick={onToggleHide} aria-label="Toggle amounts">
              {hideAmounts ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          )}

          <Link href="/notifications" aria-label="Notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </Link>

          <div className="hidden lg:block">
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarFallback>{(userName ?? tc("appName")).slice(0, 1)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
