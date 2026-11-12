"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const budgetSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  amountPaisa: z.bigint().positive(),
  month: z.string(), // YYYY-MM-DD (first day)
  rollover: z.boolean().default(false),
});

export async function createBudget(input: z.infer<typeof budgetSchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets").insert({
    book_id: book.id,
    category_id: input.categoryId || null,
    amount: input.amountPaisa.toString(),
    month: input.month,
    rollover: input.rollover,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return data;
}

export async function updateBudget(id: string, input: Partial<z.infer<typeof budgetSchema>>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.categoryId !== undefined) patch.category_id = input.categoryId || null;
  if (input.amountPaisa !== undefined) patch.amount = input.amountPaisa.toString();
  if (input.month !== undefined) patch.month = input.month;
  if (input.rollover !== undefined) patch.rollover = input.rollover;
  const { error } = await supabase.from("budgets").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
}

type AnyClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof import("@/lib/supabase/server").createAdminClient>;

/** Budget month is a Dhaka-local "YYYY-MM-01", not a UTC one. */
function currentBudgetMonth(now = new Date()): string {
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return `${dhaka.getUTCFullYear()}-${String(dhaka.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Check 80%/100% thresholds and insert notifications (cron + after a tx create).
 * Pass `client` when running without a user session (cron uses the service role).
 * Notifications are de-duplicated per budget *and* threshold so a book is told
 * "80% used" once, not on every single expense afterwards.
 */
export async function checkBudgetAlerts(bookId: string, opts?: { client?: AnyClient }) {
  const supabase = opts?.client ?? (await createClient());
  const month = currentBudgetMonth();
  const { data: usage } = await supabase.from("budget_usage").select("*").eq("book_id", bookId).eq("month", month);
  if (!usage?.length) return { checked: 0, notified: 0 };

  const { data: members } = await supabase.from("book_members").select("user_id").eq("book_id", bookId);
  let notified = 0;

  for (const u of usage) {
    const budgetAmount = BigInt(u.budget_amount);
    const pct = budgetAmount > BigInt(0) ? Number((BigInt(u.spent) * BigInt(100)) / budgetAmount) : 0;
    if (pct < 80) continue;

    const threshold = pct >= 100 ? 100 : 80;
    for (const m of members ?? []) {
      const { error } = await supabase.from("notifications").upsert(
        {
          user_id: m.user_id,
          book_id: bookId,
          type: "budget_alert",
          title: threshold >= 100 ? "Budget exceeded!" : "Budget 80% used",
          body: `${pct}% of budget used`,
          data: { budget_id: u.budget_id, pct, threshold },
          dedupe_key: `budget:${u.budget_id}:${month}:${threshold}`,
        },
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
      );
      if (!error) notified++;
    }
  }

  return { checked: usage.length, notified };
}
