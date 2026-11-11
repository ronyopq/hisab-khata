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

/** Check 80%/100% thresholds and insert notifications (called by cron + after tx create). */
export async function checkBudgetAlerts(bookId: string) {
  const supabase = await createClient();
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const { data: usage } = await supabase.from("budget_usage").select("*").eq("book_id", bookId).eq("month", month);
  const { data: members } = await supabase.from("book_members").select("user_id").eq("book_id", bookId);
  for (const u of usage ?? []) {
    const pct = u.budget_amount > BigInt(0) ? Number(BigInt(u.spent) * BigInt(100) / BigInt(u.budget_amount)) : 0;
    if (pct >= 80) {
      for (const m of members ?? []) {
        await supabase.from("notifications").insert({
          user_id: m.user_id,
          book_id: bookId,
          type: "budget_alert",
          title: pct >= 100 ? "Budget exceeded!" : "Budget 80% used",
          body: `${pct}% of budget used`,
          data: { budget_id: u.budget_id, pct },
        });
      }
    }
  }
}
