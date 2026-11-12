import type { Locale } from "@/lib/i18n/config";

export type DigitStyle = "bengali" | "latin";
export type GroupingStyle = "lakh" | "international";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}

/**
 * `bigint` paisa → exact "1234.56" string.
 *
 * Everything downstream formats this string. It must never go through
 * `Number()`: amounts above 2^53 paisa (~90 trillion taka) would silently lose
 * precision, and even ordinary sums can pick up float error.
 */
export function paisaToDecimalString(paisa: bigint): { sign: string; whole: string; fraction: string } {
  const negative = paisa < BigInt(0);
  const abs = negative ? -paisa : paisa;
  const whole = abs / BigInt(100);
  const fraction = abs % BigInt(100);
  return {
    sign: negative ? "-" : "",
    whole: whole.toString(),
    fraction: fraction.toString().padStart(2, "0"),
  };
}

/** Group digits by Indian/Bangladeshi lakh-crore convention: 12,34,56,789 */
export function groupLakh(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/** Group digits internationally: 1,234,567,890 */
export function groupInternational(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export interface FormatMoneyOptions {
  locale?: Locale;
  digitStyle?: DigitStyle;
  currency?: string;
  grouping?: GroupingStyle;
  showSign?: boolean;
  type?: "income" | "expense" | "transfer";
  /** Force ".00" even for round amounts. */
  alwaysPaisa?: boolean;
}

/**
 * Format bigint paisa → display string, without ever converting the whole
 * amount to a float. The symbol comes from Intl (locale-correct), the digits
 * are grouped by hand so lakh and international grouping are both correct.
 */
export function formatMoney(amountPaisa: bigint | number, opts: FormatMoneyOptions = {}): string {
  const {
    locale = "bn",
    digitStyle = "bengali",
    currency = "BDT",
    grouping = "lakh",
    showSign = false,
    type,
    alwaysPaisa = false,
  } = opts;

  const paisa = typeof amountPaisa === "bigint" ? amountPaisa : BigInt(Math.round(amountPaisa));
  const { sign, whole, fraction } = paisaToDecimalString(paisa);

  const grouped = grouping === "lakh" ? groupLakh(whole) : groupInternational(whole);
  const showFraction = alwaysPaisa || fraction !== "00";
  const digits = showFraction ? `${grouped}.${fraction}` : grouped;

  // Currency symbol only — the number itself is formatted above.
  const symbol = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? "";

  const displayNumber =
    locale === "bn" && digitStyle === "bengali" ? toBengaliDigits(digits) : digits;

  // Bengali convention puts the symbol after the number; keep it locale-neutral here.
  const core = symbol ? `${symbol}${displayNumber}` : displayNumber;

  if (showSign && type) {
    if (type === "income") return `${sign || "+"}${core}`;
    if (type === "expense") return `${sign || "−"}${core}`;
  }
  return `${sign}${core}`;
}

/** Parse user input "1,250.50" / "১,২৫০.৫০" → paisa bigint. Returns null on invalid. */
export function parseMoneyToPaisa(input: string): bigint | null {
  const cleaned = toLatinDigits(input)
    .replace(/[,_\s]/g, "")
    .replace(/[৳$€£]/g, "")
    .trim();
  if (!cleaned || !/^-?\d*(\.\d*)?$/.test(cleaned)) return null;

  const [wholePart, fractionPart = ""] = cleaned.split(".");
  // Take the first two fraction digits, pad to two — no float round-trip.
  const fraction = (fractionPart + "00").slice(0, 2);
  const whole = wholePart === "" || wholePart === "-" ? "0" : wholePart.replace(/^-/, "");
  const negative = cleaned.startsWith("-");
  const value = BigInt(whole) * BigInt(100) + BigInt(fraction);
  return negative ? -value : value;
}

/** Percentage change vs previous period. Server-safe (no "use client"). */
export function pctChange(current: bigint, previous: bigint): { pct: string; up: boolean } {
  if (previous === BigInt(0)) {
    return { pct: current === BigInt(0) ? "০%" : "+১০০%", up: current > BigInt(0) };
  }
  // Integer maths: (current - previous) * 100 / previous, rounded.
  const diff = current - previous;
  const scaled = (diff * BigInt(10000)) / previous; // basis points
  const pctBp = Number(scaled);
  const absWhole = Math.abs(Math.round(pctBp / 100));
  const bn = toBengaliDigits(absWhole);
  return { pct: `${pctBp >= 0 ? "+" : "−"}${bn}%`, up: pctBp >= 0 };
}
