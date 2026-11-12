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

/**
 * Advance one period, clamping the day so 31 Jan + 1 month = 28/29 Feb instead of
 * rolling into March (plain Date#setMonth overflows).
 */
function nextDate(from: Date, frequency: string, interval: number): Date {
  const d = new Date(from);
  if (frequency === "daily") {
    d.setDate(d.getDate() + interval);
  } else if (frequency === "weekly") {
    d.setDate(d.getDate() + 7 * interval);
  } else if (frequency === "monthly" || frequency === "yearly") {
    const months = frequency === "monthly" ? interval : interval * 12;
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
  }
  return d;
}

/** How many periods have elapsed, plus the first un-run date (catch-up support). */
function dueRuns(from: Date, now: Date, frequency: string, interval: number, max = 24): Date[] {
  const runs: Date[] = [];
  let cursor = new Date(from);
  while (cursor <= now && runs.length < max) {
    runs.push(new Date(cursor));
    cursor = nextDate(cursor, frequency, interval);
  }
  return runs;
}

// Narrow alias so the implementation below is testable and readable.
type Administration = ReturnType<typeof import("@/lib/supabase/server").createAdminClient>;

/**
 * Cron processor: auto_create transactions + remind_only notifications.
 * Runs with the service-role client, so it must set created_by itself.
 */
export async function processRecurring(options?: { dryRun?: boolean }) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient() as Administration;
  return runRecurring(admin, options?.dryRun ?? false);
}

async function runRecurring(admin: Administration, dryRun: boolean) {
  const now = new Date();
  const { data: rules, error: rulesError } = await admin
    .from("recurring_rules")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", now.toISOString());

  if (rulesError) throw new Error(rulesError.message);

  let created = 0;
  let reminded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of rules ?? []) {
    try {
      if (r.end_at && new Date(r.next_run_at) > new Date(r.end_at)) {
        if (!dryRun) {
          await admin.from("recurring_rules").update({ is_active: false }).eq("id", r.id);
        }
        continue;
      }

      // created_by must be a real profile id (transactions.created_by is RESTRICT).
      const { data: owner } = await admin
        .from("book_members")
        .select("user_id")
        .eq("book_id", r.book_id)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      if (!owner?.user_id) {
        errors.push(`${r.id}: book has no owner`);
        failed++;
        continue;
      }

      // Missed periods are caught up (bounded), so a cron outage doesn't lose money data.
      const runs = dueRuns(new Date(r.next_run_at), now, r.frequency, r.interval);

      if (r.mode === "auto_create") {
        for (const run of runs) {
          // Idempotency: a transaction already exists for this period?
          const { data: existing } = await admin
            .from("transactions")
            .select("id")
            .eq("recurring_rule_id", r.id)
            .eq("occurred_at", run.toISOString())
            .is("deleted_at", null)
            .maybeSingle();
          if (existing) continue;

          const { error } = await admin.from("transactions").insert({
            book_id: r.book_id,
            type: r.type,
            amount: r.amount,
            wallet_id: r.wallet_id,
            category_id: r.category_id,
            occurred_at: run.toISOString(),
            note: r.note,
            recurring_rule_id: r.id,
            created_by: owner.user_id,
          });
          if (error) {
            errors.push(`${r.id}: ${error.message}`);
            failed++;
            break; // do not advance the cursor on failure
          }
          created++;
        }
      } else {
        const { data: members } = await admin.from("book_members").select("user_id").eq("book_id", r.book_id);
        const day = now.toISOString().slice(0, 10);
        for (const m of members ?? []) {
          if (!dryRun) {
            await admin.from("notifications").upsert(
              {
                user_id: m.user_id,
                book_id: r.book_id,
                type: "recurring_reminder",
                title: "Recurring reminder",
                body: r.note ?? "Recurring transaction due",
                data: { rule_id: r.id },
                dedupe_key: `recurring:${r.id}:${day}`,
              },
              { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
            );
          }
        }
        reminded++;
      }

      if (!dryRun) {
        // Only advance once the work for this rule succeeded.
        const next = nextDate(new Date(r.next_run_at), r.frequency, r.interval);
        const past = runs.length > 0 ? runs[runs.length - 1] : new Date(r.next_run_at);
        const advanced = runs.length > 0
          ? nextDate(past, r.frequency, r.interval)
          : next;
        const shouldDeactivate = r.end_at && advanced > new Date(r.end_at);
        await admin
          .from("recurring_rules")
          .update({ next_run_at: advanced.toISOString(), is_active: shouldDeactivate ? false : true })
          .eq("id", r.id);
      }
    } catch (e) {
      failed++;
      errors.push(`${r.id}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return {
    created,
    reminded,
    failed,
    processed: rules?.length ?? 0,
    errors: errors.slice(0, 10),
  };
}
