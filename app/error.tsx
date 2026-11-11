"use client";
import { Button } from "@/components/ui/button";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-xl font-bold">Something went wrong</h1><p className="text-sm text-muted-foreground">{error.message}</p><Button onClick={reset}>Try again</Button></div>;
}
