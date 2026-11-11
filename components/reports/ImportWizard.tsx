"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { parseCSV, mapImportRows, type ImportRow } from "@/lib/export/import";
import { createTransaction } from "@/lib/actions/transactions";
import { toast } from "sonner";

export function ImportWizard({ wallets, categories }: { wallets: { id: string; name: string }[]; categories: { id: string; name_bn: string }[] }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState({ amount: "amount", date: "date", type: "type", note: "note", category: "category", wallet: "wallet" });
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    setRows(parsed);
    setPreview(mapImportRows(parsed, mapping));
    toast.success(`${parsed.length} rows parsed`);
  };

  const handleImport = async () => {
    setLoading(true);
    let ok = 0;
    for (const r of preview) {
      try {
        const wallet = wallets.find((w) => w.name.toLowerCase() === (r.walletName ?? "").toLowerCase()) ?? wallets[0];
        const cat = categories.find((c) => c.name_bn === r.categoryName);
        if (!wallet) continue;
        await createTransaction({
          type: r.type,
          amountPaisa: r.amountPaisa,
          walletId: wallet.id,
          categoryId: cat?.id ?? null,
          occurredAt: new Date(r.date),
          note: r.note,
          tags: [],
        });
        ok++;
      } catch {
        // skip invalid
      }
    }
    toast.success(`Imported ${ok}/${preview.length} transactions`);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>CSV File</Label>
        <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <p className="text-xs text-muted-foreground">Columns: amount, date, type (income/expense), note, category, wallet</p>
      </div>
      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(mapping) as (keyof typeof mapping)[]).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="capitalize">{key} column</Label>
                <Input value={mapping[key]} onChange={(e) => {
                  const next = { ...mapping, [key]: e.target.value };
                  setMapping(next);
                  setPreview(mapImportRows(rows, next));
                }} />
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-sm font-semibold">Preview ({preview.length} valid rows)</p>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
              {preview.slice(0, 10).map((r, i) => (
                <p key={i} className="tabular">{r.type} • ৳{(Number(r.amountPaisa) / 100).toFixed(2)} • {r.date} • {r.note ?? ""}</p>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleImport} disabled={loading || preview.length === 0}>
            {loading ? "Importing..." : `Import ${preview.length} Transactions`}
          </Button>
        </>
      )}
    </div>
  );
}
