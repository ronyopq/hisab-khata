import type { MetadataRoute } from "next";

/**
 * The ledger is private: nothing behind auth should be indexed, and crawlers
 * should not be able to enumerate /admin or the API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/signup", "/invite"],
        disallow: ["/", "/api/", "/admin", "/dashboard", "/transactions", "/wallets", "/settings"],
      },
    ],
    sitemap: undefined,
    host: process.env.NEXT_PUBLIC_SITE_URL,
  };
}
