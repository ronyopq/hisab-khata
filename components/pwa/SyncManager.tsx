"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getQueued, syncQueue } from "@/lib/offline/queue";
import { createTransaction } from "@/lib/actions/transactions";

/**
 * Syncs offline-queued transactions when connectivity returns.
 * Mounted once in AppShell. Also syncs on mount if there are leftovers.
 */
export function SyncManager() {
  const t = useTranslations("sync");
  const syncing = useRef(false);

  useEffect(() => {
    async function runSync() {
      if (syncing.current || !navigator.onLine) return;
      const queued = await getQueued().catch(() => []);
      if (queued.length === 0) return;
      syncing.current = true;
      try {
        const { synced, failed } = await syncQueue(async (p) => {
          await createTransaction({
            type: p.type,
            amountPaisa: BigInt(p.amountPaisa),
            walletId: p.walletId,
            toWalletId: p.toWalletId,
            categoryId: p.categoryId ?? undefined,
            occurredAt: new Date(p.occurredAt),
            note: p.note,
            tags: p.tags,
          });
        });
        if (synced > 0) toast.success(t("synced", { count: synced }));
        if (failed > 0) toast.error(t("syncFailed", { count: failed }));
      } finally {
        syncing.current = false;
      }
    }

    // Sync any leftovers on mount.
    runSync();
    window.addEventListener("online", runSync);
    return () => window.removeEventListener("online", runSync);
  }, [t]);

  return null;
}
