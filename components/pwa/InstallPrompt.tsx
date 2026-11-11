"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !(window.navigator as Navigator & { standalone?: boolean }).standalone) {
      const t = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => { window.removeEventListener("beforeinstallprompt", handler); clearTimeout(t); };
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
  };

  return (
    <>
      {deferred && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-2xl lg:bottom-6">
          <Download className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Install Hisab Khata</span>
          <Button size="sm" onClick={handleInstall}>Install</Button>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
      )}

      <Drawer.Root open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-background p-6 safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
            <Drawer.Title className="text-center font-semibold">Add to Home Screen</Drawer.Title>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center gap-2"><Share className="h-5 w-5 text-primary" /> Tap Share in Safari</p>
              <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              <p>Tap <strong>Add</strong> — Hisab Khata will work like a native app.</p>
            </div>
            <Button className="mt-5 w-full" onClick={() => setShowIOSGuide(false)}>Got it</Button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
