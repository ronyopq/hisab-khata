import { parseMoneyToPaisa } from "@/lib/format/money";
import { parseCSVRecords } from "./csv";

export { parseCSVRecords as parseCSV };

export interface ImportRow {
  type: "income" | "expense";
  amountPaisa: bigint;
  date: string;
  note?: string;
  categoryName?: string;
  walletName?: string;
}

/**
 * Accept the shapes a real-world CSV uses: 2026-11-12, 12/11/2026 (Dhaka
 * dd/mm/yyyy), 12-11-2026, and anything Date can parse. Returns ISO or null.
 */
export function parseImportDate(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    // Dhaka writes day first; build as local noon to avoid TZ day-shift.
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Map CSV columns → ImportRow. mapping: { amount: "col", date: "col", ... } */
export function mapImportRows(rows: Record<string, string>[], mapping: Record<string, string>): ImportRow[] {
  const result: ImportRow[] = [];
  for (const row of rows) {
    // Accept both the app's own export headers and the Bengali aliases.
    const amountRaw = row[mapping.amount] ?? row["amount"] ?? row["টাকা"] ?? row["amount_taka"] ?? "";
    const paisa = parseMoneyToPaisa(amountRaw);
    if (!paisa || paisa === BigInt(0)) continue;

    const typeRaw = (row[mapping.type] ?? row["type"] ?? "expense").toLowerCase();
    const iso = parseImportDate(row[mapping.date] ?? row["date"] ?? row["তারিখ"] ?? undefined);
    if (!iso) continue;

    result.push({
      type: typeRaw.includes("income") || typeRaw.includes("আয়") ? "income" : "expense",
      amountPaisa: paisa,
      date: iso,
      note: row[mapping.note] ?? row["note"] ?? row["বিবরণ"] ?? undefined,
      categoryName: row[mapping.category] ?? row["category"] ?? row["ক্যাটাগরি"] ?? undefined,
      walletName: row[mapping.wallet] ?? row["wallet"] ?? row["ওয়ালেট"] ?? undefined,
    });
  }
  return result;
}
