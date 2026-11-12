/**
 * Local app-lock PIN — optional, stored only in this browser's localStorage and
 * never sent to the server.
 *
 * Security notes:
 * - PBKDF2-SHA-256 with a per-install random salt, 210k iterations (OWASP 2023).
 *   A single unsalted SHA-256 (what this file used to do) is reversible from a
 *   rainbow table in milliseconds for a 4–6 digit PIN.
 * - Comparison is constant-time-ish (full-string loop, no early return).
 * - Failed attempts are counted and backed off exponentially, so guessing
 *   10^6 PINs one request at a time is not practical.
 * - Everything here runs in the browser; Web Crypto is unavailable in Node, so
 *   this module must only be imported from client components.
 */

export const APP_LOCK_KEY = "hk-app-lock";
export const APP_LOCK_LAST_ACTIVE = "hk-app-lock-last-active";
export const APP_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity
const FAILS_KEY = "hk-app-lock-fails";
const PBKDF2_ITERATIONS = 210_000;
const PIN_LENGTH = 6;

export interface StoredLock {
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

/** Length-independent comparison so timing does not leak how many digits matched. */
function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function createLock(pin: string): Promise<StoredLock> {
  if (!isValidPin(pin)) throw new Error(`PIN must be ${PIN_LENGTH} digits`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  const lock: StoredLock = {
    salt: toHex(salt.buffer),
    hash,
    iterations: PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(APP_LOCK_KEY, JSON.stringify(lock));
  resetFailures();
  markActive();
  return lock;
}

export function getLock(): StoredLock | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(APP_LOCK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredLock;
    return parsed?.salt && parsed?.hash ? parsed : null;
  } catch {
    return null;
  }
}

export function removeLock(): void {
  localStorage.removeItem(APP_LOCK_KEY);
  localStorage.removeItem(APP_LOCK_LAST_ACTIVE);
  resetFailures();
}

// --- brute-force backoff -----------------------------------------------------

export function failureCount(): number {
  return Number(localStorage.getItem(FAILS_KEY) ?? "0") || 0;
}

/** 0s, 0s, 0s, 5s, 15s, 45s, 2m, 5m, then 15m. */
export function unlockDelayMs(failures = failureCount()): number {
  if (failures < 3) return 0;
  const table = [5_000, 15_000, 45_000, 120_000, 300_000, 900_000];
  const index = Math.min(failures - 3, table.length - 1);
  return table[index];
}

export function recordFailure(): void {
  const next = failureCount() + 1;
  localStorage.setItem(FAILS_KEY, String(next));
}

export function resetFailures(): void {
  localStorage.removeItem(FAILS_KEY);
}

// --- unlock -----------------------------------------------------------------

export async function verifyPin(pin: string): Promise<boolean> {
  const lock = getLock();
  if (!lock) return true; // no lock configured ⇒ nothing to unlock
  const hash = await derive(pin, fromHex(lock.salt), lock.iterations || PBKDF2_ITERATIONS);
  const ok = constantTimeEqual(hash, lock.hash);
  if (ok) {
    resetFailures();
    markActive();
  } else {
    recordFailure();
  }
  return ok;
}

export function markActive(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(APP_LOCK_LAST_ACTIVE, String(Date.now()));
}

export function shouldLock(now = Date.now()): boolean {
  if (typeof localStorage === "undefined") return false;
  if (!getLock()) return false;
  const last = Number(localStorage.getItem(APP_LOCK_LAST_ACTIVE) ?? "0");
  if (!last) return true;
  return now - last > APP_LOCK_TIMEOUT_MS;
}
