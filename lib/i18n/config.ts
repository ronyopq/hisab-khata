import { defineRouting } from "next-intl/routing";

export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "never",
});
