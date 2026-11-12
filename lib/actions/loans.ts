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
  // Informational only: which wallet the money left/entered. Deliberately does
  // NOT create a transaction — loans are tracked as পাওনা/দেনা, not as spending.
  walletId: z.string().uuid().nullable().optional(),
  issuedAt: z.date(),
  dueAt: z.date().nullable().optional(),
  note: z.string().max(500).optional(),
});

const paymentSchema = z.object({
  debtId: z.string().uuid(),
  amountPaisa: z.bigint().positive(),
  walletId: z.string().uuid().nullable().optional(),
  paidAt: z.date(),
  note: z.string().max(500).optional(),
});

export async function createDebt(input: z.infer<typeof debtSchema>) {
  const parsed = debtSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid loan details");
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
  const parsed = paymentSchema.safeParse({
    debtId: input.debtId,
    amountPaisa: input.amountPaisa,
    walletId: input.walletId || null,
    paidAt: input.paidAt,
    note: input.note,
  });
  if (!parsed.success) throw new Error("Invalid payment details");

  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();

  // The debt must belong to the active book (RLS also checks membership).
  const { data: debt } = await supabase
    .from("debts")
    .select("id, amount")
    .eq("id", parsed.data.debtId)
    .eq("book_id", book.id)
    .maybeSingle();
  if (!debt) throw new Error("Loan not found in this book");

  const { data: existing } = await supabase
    .from("debt_payments")
    .select("amount")
    .eq("debt_id", debt.id);
  const alreadyPaid = (existing ?? []).reduce((sum, p) => sum + BigInt(p.amount), BigInt(0));
  const remaining = BigInt(debt.amount) - alreadyPaid;
  if (parsed.data.amountPaisa > remaining) {
    throw new Error("Payment is larger than the outstanding amount");
  }

  const { data, error } = await supabase.from("debt_payments").insert({
    debt_id: parsed.data.debtId,
    amount: parsed.data.amountPaisa.toString(),
    wallet_id: parsed.data.walletId || null,
    paid_at: parsed.data.paidAt.toISOString(),
    note: parsed.data.note || null,
  }).select().single();
  if (error) throw new Error(error.message);

  // Auto-settle when the new payment clears the balance.
  if (parsed.data.amountPaisa === remaining) {
    await supabase.from("debts").update({ status: "settled" }).eq("id", parsed.data.debtId);
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
