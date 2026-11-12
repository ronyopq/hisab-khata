"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { locales, type Locale } from "./config";

/**
 * Every export of a "use server" module must be an async function, so the cookie
 * name lives in ./config and is re-exported there — not here.
 */
export async function setLocale(locale: Locale) {
  if (!(locales as readonly string[]).includes(locale)) {
    throw new Error("Unsupported locale");
  }
  const store = await cookies();
  store.set("hk-locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
