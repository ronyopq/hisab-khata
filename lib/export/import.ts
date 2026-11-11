import { parseMoneyToPaisa } from "@/lib/format/money";

export interface ImportRow {
  type: "income" | "expense";
  amountPaisa: bigint;
  date: string;
  note?: string;
  categoryName?: string;
  walletName?: string;
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = values[i] ?? ""));
    return obj;
  });
}

/** Map CSV columns → ImportRow. mapping: { amount: "col", date: "col", ... } */
export function mapImportRows(rows: Record<string, string>[], mapping: Record<string, string>): ImportRow[] {
  const result: ImportRow[] = [];
  for (const row of rows) {
    const amountRaw = row[mapping.amount] ?? row["amount"] ?? row["টাকা"] ?? "";
    const paisa = parseMoneyToPaisa(amountRaw);
    if (!paisa) continue;
    const typeRaw = (row[mapping.type] ?? row["type"] ?? "expense").toLowerCase();
    result.push({
      type: typeRaw.includes("income") || typeRaw.includes("আয়") ? "income" : "expense",
      amountPaisa: paisa,
      date: row[mapping.date] ?? row["date"] ?? new Date().toISOString(),
      note: row[mapping.note] ?? row["note"] ?? undefined,
      categoryName: row[mapping.category] ?? row["category"] ?? undefined,
      walletName: row[mapping.wallet] ?? row["wallet"] ?? undefined,
    });
  }
  return result;
}
