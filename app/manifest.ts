import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hisab Khata — হিসাব খাতা",
    short_name: "Hisab Khata",
    description: "Personal income & expense ledger — ব্যক্তিগত আয়-ব্যয়ের হিসাব",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#10b981",
    lang: "bn",
    dir: "ltr",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", short_name: "Expense", url: "/dashboard?add=expense", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Add income", short_name: "Income", url: "/dashboard?add=income", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
