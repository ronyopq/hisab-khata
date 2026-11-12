import { defineRouting } from "next-intl/routing";

export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "never",
});

/** Cookie the app reads its locale from (see i18n.ts). */
export const LOCALE_COOKIE = "hk-locale";
