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
  };
  createdAt: string;
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
    tx.objectStore(STORE).add({ payload, createdAt: new Date().toISOString() });
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
      await createFn(item.payload);
      if (item.id) await clearQueued(item.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
