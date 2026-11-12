"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command-dialog";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeftRight, Tags, Wallet, LayoutDashboard, Settings } from "lucide-react";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; label: string; type: string; href: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      if (!query || query.length < 2) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Late responses must not overwrite results for a newer query.
      if (cancelled) return;
      const { data: profile } = await supabase.from("profiles").select("active_book_id").eq("id", user.id).single();
      if (!profile?.active_book_id) return;
      // Strip characters that carry meaning in PostgREST's filter grammar
      // (`,` `(` `)` separate/group filters) before interpolating into `.or()`.
      const safeQuery = query.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
      if (!safeQuery) { setResults([]); return; }
      const pattern = `%${safeQuery}%`;
      const [tx, cats, wallets] = await Promise.all([
        supabase.from("transactions").select("id, note, payee").eq("book_id", profile.active_book_id).is("deleted_at", null).or(`note.ilike.${pattern},payee.ilike.${pattern}`).limit(5),
        supabase.from("categories").select("id, name_bn, name_en").eq("book_id", profile.active_book_id).or(`name_bn.ilike.${pattern},name_en.ilike.${pattern}`).limit(5),
        supabase.from("wallets").select("id, name").eq("book_id", profile.active_book_id).ilike("name", pattern).limit(5),
      ]);
      const items = [
        ...(tx.data ?? []).map((t) => ({ id: t.id, label: t.payee || t.note || "Transaction", type: "transaction", href: "/transactions" })),
        ...(cats.data ?? []).map((c) => ({ id: c.id, label: `${c.name_bn} / ${c.name_en}`, type: "category", href: "/categories" })),
        ...(wallets.data ?? []).map((w) => ({ id: w.id, label: w.name, type: "wallet", href: "/wallets" })),
      ];
      if (!cancelled) setResults(items.length ? items : []);
    })();
    return () => { cancelled = true; };
  }, [query]);

  const pages = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    { label: "Wallets", href: "/wallets", icon: Wallet },
    { label: "Categories", href: "/categories", icon: Tags },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search transactions, categories, wallets, pages..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((r) => (
              <CommandItem key={r.type + r.id} onSelect={() => { router.push(r.href); onOpenChange(false); }}>
                {r.type === "transaction" ? <ArrowLeftRight className="mr-2 h-4 w-4" /> : r.type === "category" ? <Tags className="mr-2 h-4 w-4" /> : <Wallet className="mr-2 h-4 w-4" />}
                {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.href} onSelect={() => { router.push(p.href); onOpenChange(false); }}>
              <p.icon className="mr-2 h-4 w-4" /> {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
