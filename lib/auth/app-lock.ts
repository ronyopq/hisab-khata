// Local 4-digit app-lock PIN (optional, after inactivity).
// Stored hashed in localStorage; never sent to server.
import { createHash } from "crypto";

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

export const APP_LOCK_KEY = "hk-app-lock";
export const APP_LOCK_LAST_ACTIVE = "hk-app-lock-last-active";
export const APP_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
