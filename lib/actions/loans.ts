"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function createContact(input: { name: string; phone?: string; note?: string }) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data, error } = await supabase.from("contacts").insert({ book_id: book.id, name: input.name, phone: input.phone || null, note: input.note || null }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/loans");
  return data;
}

const debtSchema = z.object({
  contactId: z.string().uuid(),
  direction: z.enum(["lent", "borrowed"]),
  amountPaisa: z.bigint().positive(),
  walletId: z.string().uuid().nullable().optional(),
  issuedAt: z.date(),
  dueAt: z.date().nullable().optional(),
  note: z.string().max(500).optional(),
});

export async function createDebt(input: z.infer<typeof debtSchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data, error } = await supabase.from("debts").insert({
    book_id: book.id,
    contact_id: input.contactId,
    direction: input.direction,
    amount: input.amountPaisa.toString(),
    wallet_id: input.walletId || null,
    issued_at: input.issuedAt.toISOString(),
    due_at: input.dueAt?.toISOString() ?? null,
    note: input.note || null,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return data;
}

export async function addDebtPayment(input: { debtId: string; amountPaisa: bigint; walletId?: string; paidAt: Date; note?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("debt_payments").insert({
    debt_id: input.debtId,
    amount: input.amountPaisa.toString(),
    wallet_id: input.walletId || null,
    paid_at: input.paidAt.toISOString(),
    note: input.note || null,
  }).select().single();
  if (error) throw new Error(error.message);
  // Auto-settle if fully paid
  const { data: bal } = await supabase.from("debt_balances").select("remaining").eq("debt_id", input.debtId).single();
  if (bal && BigInt(bal.remaining) <= BigInt(0)) {
    await supabase.from("debts").update({ status: "settled" }).eq("id", input.debtId);
  }
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return data;
}

export async function settleDebt(debtId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").update({ status: "settled" }).eq("id", debtId);
  if (error) throw new Error(error.message);
  revalidatePath("/loans");
}
