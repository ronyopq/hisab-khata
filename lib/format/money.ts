import type { Locale } from "@/lib/i18n/config";

export type DigitStyle = "bengali" | "latin";
export type GroupingStyle = "lakh" | "international";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

export interface FormatMoneyOptions {
  locale?: Locale;
  digitStyle?: DigitStyle;
  currency?: string;
  grouping?: GroupingStyle;
  showSign?: boolean;
  type?: "income" | "expense" | "transfer";
}

/**
 * Format bigint paisa → display string.
 * Never uses float for storage; display conversion only.
 */
export function formatMoney(amountPaisa: bigint | number, opts: FormatMoneyOptions = {}): string {
  const {
    locale = "bn",
    digitStyle = "bengali",
    currency = "BDT",
    grouping = "lakh",
    showSign = false,
    type,
  } = opts;

  const paisa = typeof amountPaisa === "bigint" ? Number(amountPaisa) : amountPaisa;
  const taka = paisa / 100;
  const hasPaisa = Math.abs(paisa % 100) !== 0;

  const intlLocale = locale === "bn" ? "bn-BD" : "en-US";
  const formatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: hasPaisa ? 2 : 0,
    useGrouping: grouping === "lakh" ? true : true,
  });

  let formatted = formatter.format(taka);

  // Intl bn-BD already uses lakh grouping; for latin digits in bn locale, convert back
  if (locale === "bn" && digitStyle === "latin") {
    formatted = formatted.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
  }
  if (locale === "bn" && digitStyle === "bengali" && !/[০-৯]/.test(formatted)) {
    formatted = toBengaliDigits(formatted);
  }

  if (showSign && type) {
    if (type === "income") return `+${formatted}`;
    if (type === "expense") return `−${formatted}`;
  }
  return formatted;
}

/** Parse user input "1,250.50" → paisa bigint. Returns null on invalid. */
export function parseMoneyToPaisa(input: string): bigint | null {
  const cleaned = input
    .replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)))
    .replace(/[,_\s]/g, "")
    .replace(/[৳$€£]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return BigInt(Math.round(num * 100));
}
