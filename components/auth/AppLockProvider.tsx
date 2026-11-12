"use client";

import { useCallback, useEffect, useState } from "react";
import {
  APP_LOCK_TIMEOUT_MS,
  getLock,
  isValidPin,
  markActive,
  shouldLock,
  unlockDelayMs,
  verifyPin,
  createLock,
  removeLock,
  failureCount,
} from "@/lib/auth/app-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck } from "lucide-react";

/**
 * Covers the app when the device has been idle longer than the lock timeout.
 *
 * This is a shoulder-surfing guard, not a server-side security boundary: the
 * data is already in the page. It exists so a shared phone does not show the
 * ledger, and it is implemented honestly (PBKDF2 + attempt backoff) rather
 * than pretending a local PIN protects the database.
 */
export function AppLockProvider() {
  // Lazily initialised: reading localStorage during the first client render is
  // safe here because this component only ever renders on the client after mount.
  const [locked, setLocked] = useState(() => (typeof window === "undefined" ? false : shouldLock()));
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);

  // Activity tracking.
  useEffect(() => {
    const onActivity = () => {
      if (!shouldLock()) markActive();
    };
    const events = ["pointerdown", "keydown", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, []);

  // Re-lock when the tab is hidden for longer than the timeout.
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      if (!locked && shouldLock()) setLocked(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [locked]);

  // Tick for the backoff countdown.
  useEffect(() => {
    if (!waitUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [waitUntil]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const delay = unlockDelayMs();
      if (Date.now() < waitUntil || delay > 0) {
        setWaitUntil(Date.now() + delay);
        setError(`Too many attempts. Wait ${Math.ceil(delay / 1000)}s.`);
        return;
      }
      setChecking(true);
      try {
        const ok = await verifyPin(pin);
        setPin("");
        if (ok) {
          setLocked(false);
          setError(null);
          setWaitUntil(0);
        } else {
          const wait = unlockDelayMs(failureCount());
          setWaitUntil(wait ? Date.now() + wait : 0);
          setError(wait ? `Wrong PIN. Wait ${Math.ceil(wait / 1000)}s.` : "Wrong PIN.");
        }
      } finally {
        setChecking(false);
      }
    },
    [pin, waitUntil]
  );

  if (!locked) return null;

  const remaining = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4 rounded-3xl border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">হিসাব খাতা লক করা আছে</h2>
          <p className="text-xs text-muted-foreground">PIN দিন (৬ সংখ্যা)</p>
        </div>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em]"
          aria-label="App lock PIN"
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pin.length !== 6 || checking || remaining > 0}>
          {remaining > 0 ? `${remaining}s` : checking ? "…" : "আনলক"}
        </Button>
        <button
          type="button"
          onClick={() => {
            removeLock();
            setLocked(false);
          }}
          className="text-[11px] text-muted-foreground underline"
        >
          PIN ভুলে গেছেন? এই ডিভাইসে লক বন্ধ করুন
        </button>
      </form>
    </div>
  );
}

/**
 * Settings control: set / change / remove the 6-digit PIN.
 * The PIN never leaves the browser.
 */
export function AppLockSettings() {
  const [hasLock, setHasLock] = useState(() => (typeof window === "undefined" ? false : Boolean(getLock())));
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!isValidPin(pin)) {
      setError("৬ সংখ্যার PIN দিন");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN দুটো মিলছে না");
      return;
    }
    await createLock(pin);
    setPin("");
    setConfirmPin("");
    setHasLock(true);
    setMessage("App lock চালু হয়েছে।");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <ShieldCheck className={hasLock ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
        <span>{hasLock ? "App lock চালু আছে (৬ সংখ্যার PIN)" : "App lock বন্ধ আছে"}</span>
      </div>
      <form onSubmit={save} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="নতুন PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            aria-label="New app lock PIN"
          />
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="আবার লিখুন"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            aria-label="Confirm app lock PIN"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" size="sm">
            {hasLock ? "PIN বদলান" : "PIN সেট করুন"}
          </Button>
          {hasLock && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                removeLock();
                setHasLock(false);
                setMessage("App lock বন্ধ করা হয়েছে।");
              }}
            >
              বন্ধ করুন
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {message && <p className="text-xs text-primary">{message}</p>}
        <p className="text-[11px] text-muted-foreground">
          PIN শুধু এই ব্রাউজারে PBKDF2 দিয়ে হ্যাশ করে রাখা হয়, সার্ভারে যায় না।{" "}
          {APP_LOCK_TIMEOUT_MS / 60000} মিনিট নিষ্ক্রিয় থাকলে লক হবে।
        </p>
      </form>
    </div>
  );
}
