import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Wallet, Tags, PiggyBank, Repeat, HandCoins, Target, BookOpen, Settings, LifeBuoy, ChevronRight } from "lucide-react";

const items = [
  { href: "/wallets", icon: Wallet, key: "wallets" },
  { href: "/categories", icon: Tags, key: "categories" },
  { href: "/budgets", icon: PiggyBank, key: "budgets" },
  { href: "/recurring", icon: Repeat, key: "recurring" },
  { href: "/loans", icon: HandCoins, key: "loans" },
  { href: "/goals", icon: Target, key: "goals" },
  { href: "/books", icon: BookOpen, key: "books" },
  { href: "/settings", icon: Settings, key: "settings" },
  { href: "/settings", icon: LifeBuoy, key: "help" },
] as const;

export default async function MorePage() {
  const t = await getTranslations("nav");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("more")}</h1>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.href + item.key}
            href={item.href}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border bg-card p-3 text-center transition-all active:scale-95 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <item.icon className="h-6 w-6" />
            </span>
            <span className="text-xs font-semibold leading-tight">{t(item.key as never)}</span>
          </Link>
        ))}
      </div>
      <Link href="/settings" className="flex items-center justify-between rounded-2xl border p-4">
        <span className="font-medium">Install App / অ্যাপ ইনস্টল করুন</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
