import { createTranslator } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["bn", "en"] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("hk-locale")?.value as Locale | undefined;
  const locale: Locale = localeCookie && (locales as readonly string[]).includes(localeCookie) ? localeCookie : "bn";
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
