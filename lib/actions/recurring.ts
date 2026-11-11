"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const recurringSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amountPaisa: z.bigint().positive(),
  walletId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).default(1),
  nextRunAt: z.date(),
  endAt: z.date().nullable().optional(),
  mode: z.enum(["auto_create", "remind_only"]),
});

export async function createRecurring(input: z.infer<typeof recurringSchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data, error } = await supabase.from("recurring_rules").insert({
    book_id: book.id,
    type: input.type,
    amount: input.amountPaisa.toString(),
    wallet_id: input.walletId,
    category_id: input.categoryId || null,
    note: input.note || null,
    frequency: input.frequency,
    interval: input.interval,
    next_run_at: input.nextRunAt.toISOString(),
    end_at: input.endAt?.toISOString() ?? null,
    mode: input.mode,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
  return data;
}

export async function updateRecurring(id: string, input: Partial<z.infer<typeof recurringSchema>>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.type !== undefined) patch.type = input.type;
  if (input.amountPaisa !== undefined) patch.amount = input.amountPaisa.toString();
  if (input.walletId !== undefined) patch.wallet_id = input.walletId;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId || null;
  if (input.note !== undefined) patch.note = input.note || null;
  if (input.frequency !== undefined) patch.frequency = input.frequency;
  if (input.interval !== undefined) patch.interval = input.interval;
  if (input.nextRunAt !== undefined) patch.next_run_at = input.nextRunAt.toISOString();
  if (input.endAt !== undefined) patch.end_at = input.endAt?.toISOString() ?? null;
  if (input.mode !== undefined) patch.mode = input.mode;
  const { error } = await supabase.from("recurring_rules").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
}

export async function toggleRecurring(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
}

export async function deleteRecurring(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
}

function nextDate(from: Date, frequency: string, interval: number): Date {
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + interval);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7 * interval);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + interval);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + interval);
  return d;
}

/** Cron processor: auto_create transactions + remind_only notifications. */
export async function processRecurring() {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: rules } = await admin.from("recurring_rules").select("*").eq("is_active", true).lte("next_run_at", now);
  let created = 0;
  let reminded = 0;
  for (const r of rules ?? []) {
    const { data: { user } } = await admin.auth.getUser().catch(() => ({ data: { user: null } }));
    // Find book owner for created_by
    const { data: owner } = await admin.from("book_members").select("user_id").eq("book_id", r.book_id).eq("role", "owner").limit(1).single();
    const createdBy = owner?.user_id;
    if (!createdBy) continue;

    if (r.mode === "auto_create") {
      const { error } = await admin.from("transactions").insert({
        book_id: r.book_id,
        type: r.type,
        amount: r.amount,
        wallet_id: r.wallet_id,
        category_id: r.category_id,
        occurred_at: r.next_run_at,
        note: r.note,
        recurring_rule_id: r.id,
        created_by: createdBy,
      });
      if (!error) created++;
    } else {
      const { data: members } = await admin.from("book_members").select("user_id").eq("book_id", r.book_id);
      for (const m of members ?? []) {
        await admin.from("notifications").insert({
          user_id: m.user_id,
          book_id: r.book_id,
          type: "recurring_reminder",
          title: "Recurring reminder",
          body: r.note ?? "Recurring transaction due",
          data: { rule_id: r.id },
        });
      }
      reminded++;
    }
    const next = nextDate(new Date(r.next_run_at), r.frequency, r.interval);
    const shouldDeactivate = r.end_at && next > new Date(r.end_at);
    await admin.from("recurring_rules").update({ next_run_at: next.toISOString(), is_active: shouldDeactivate ? false : true }).eq("id", r.id);
  }
  return { created, reminded, processed: rules?.length ?? 0 };
}
