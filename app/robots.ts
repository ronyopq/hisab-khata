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
    // No `host` and no `sitemap`: the host directive must be a bare hostname
    // (not a URL), and there is nothing public worth advertising in a sitemap.
    sitemap: undefined,
  };
}
