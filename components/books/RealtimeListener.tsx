"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function RealtimeListener({ bookId }: { bookId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`book-${bookId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `book_id=eq.${bookId}` }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs", filter: `book_id=eq.${bookId}` }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "book_members", filter: `book_id=eq.${bookId}` }, () => {
        toast.info("Book members updated");
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, router]);

  return null;
}
