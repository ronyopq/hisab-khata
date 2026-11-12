import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Serves the compiled service worker.
 *
 * @serwist/next does not support Turbopack (the only bundler this project uses),
 * so it never emitted public/sw.js and the PWA had no service worker at all.
 * @serwist/turbopack builds it through this route handler instead, which is
 * prerendered to /serwist/sw.js at build time.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    // Only the public offline page is precached. Precache entries are immutable,
    // so a per-user page like /dashboard must NOT go in here — it is cached at
    // runtime by the NetworkFirst navigation strategy instead.
    additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
    // Avoid pulling the whole build output into the precache manifest.
    globPatterns: ["**/*.{js,css,woff2,ico,png,svg,webmanifest}"],
    // esbuild-wasm is a pure-JS WASM build: it works without native binaries.
    useNativeEsbuild: false,
  });
