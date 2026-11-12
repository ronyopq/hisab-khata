import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

/**
 * Service worker.
 *
 * Before this, sw.ts registered a bare Serwist with no strategies and the build
 * never emitted public/sw.js, so "offline support" did not exist at all: every
 * page was a network round-trip and the app fell back to the browser's dino.
 *
 * Caching policy:
 * - Page navigations: NetworkFirst (fresh online, last-seen page offline,
 *   /offline as the final document fallback).
 * - Static assets (/_next/static, fonts): CacheFirst — they are content-hashed.
 * - Images: StaleWhileRevalidate.
 * - Supabase REST/auth is never cached: stale balances are worse than an error.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const OFFLINE_URL = "/offline";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Never serve stale financial data or a cached auth response.
      matcher: ({ url }) => url.pathname.startsWith("/api/") || url.hostname.endsWith(".supabase.co"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/_next/static/") || /\.(?:js|css|woff2?)$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ url }) => /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

export default serwist;
