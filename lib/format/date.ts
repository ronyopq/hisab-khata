import { format, formatDistanceToNow } from "date-fns";
import { bn, enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/config";

export function formatDate(date: Date | string, locale: Locale = "bn", pattern = "dd MMM yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: locale === "bn" ? bn : enUS });
}

export function formatRelative(date: Date | string, locale: Locale = "bn"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: locale === "bn" ? bn : enUS });
}

export function getGreeting(date = new Date()): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}
