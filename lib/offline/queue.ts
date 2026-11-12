// Offline transaction queue in IndexedDB — sync when back online.
const DB_NAME = "hisab-khata-offline";
const STORE = "tx-queue";

export interface QueuedTx {
  id?: number;
  payload: {
    type: "income" | "expense" | "transfer";
    amountPaisa: string;
    walletId: string;
    toWalletId?: string;
    categoryId?: string | null;
    occurredAt: string;
    note?: string;
    tags: string[];
    /** Set by the sync manager so a retried batch cannot double-insert. */
    idempotencyKey?: string;
  };
  createdAt: string;
  /** Idempotency key: two devices syncing the same queued item create one row. */
  idempotencyKey?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueTransaction(payload: QueuedTx["payload"]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      payload,
      createdAt: new Date().toISOString(),
      idempotencyKey: crypto.randomUUID(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueued(): Promise<QueuedTx[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedTx[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearQueued(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncQueue(createFn: (payload: QueuedTx["payload"]) => Promise<unknown>): Promise<{ synced: number; failed: number }> {
  const items = await getQueued();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await createFn({ ...item.payload, idempotencyKey: item.idempotencyKey ?? item.createdAt });
      if (item.id) await clearQueued(item.id);
      synced++;
    } catch (error) {
      // A validation error (e.g. the wallet was deleted) will never succeed on
      // retry, so it is dropped with a count instead of blocking the queue
      // forever. Transient network failures stay queued.
      const message = error instanceof Error ? error.message : "";
      const permanent = /not found|invalid|violates|does not exist|No active book/i.test(message);
      if (permanent) {
        if (item.id) await clearQueued(item.id);
        failed++;
      }
    }
  }
  return { synced, failed };
}
