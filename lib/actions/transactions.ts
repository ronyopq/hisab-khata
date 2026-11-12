"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const txSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amountPaisa: z.bigint().positive(),
  walletId: z.string().uuid(),
  toWalletId: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  occurredAt: z.date(),
  note: z.string().max(500).optional(),
  payee: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  attachmentPath: z.string().optional(),
  /** Offline-sync key. A repeated sync of the same queued item is a no-op. */
  idempotencyKey: z.string().max(64).optional(),
});

export async function createTransaction(input: z.infer<typeof txSchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  if (input.type === "transfer") {
    if (!input.toWalletId) throw new Error("Transfer needs destination wallet");
    if (input.walletId === input.toWalletId) throw new Error("Same wallet");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Offline replay: if this queued item was already synced (double event, two
  // tabs, a retry after a timeout), return the existing row instead of doubling
  // the user's spending.
  if (input.idempotencyKey) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("*")
      .eq("book_id", book.id)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await supabase.from("transactions").insert({
    book_id: book.id,
    type: input.type,
    amount: input.amountPaisa.toString(),
    wallet_id: input.walletId,
    to_wallet_id: input.type === "transfer" ? input.toWalletId : null,
    category_id: input.type === "transfer" ? null : (input.categoryId || null),
    occurred_at: input.occurredAt.toISOString(),
    note: input.note || null,
    payee: input.payee || null,
    tags: input.tags,
    attachment_path: input.attachmentPath || null,
    idempotency_key: input.idempotencyKey ?? null,
    created_by: user.id,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  return data;
}

export async function updateTransaction(id: string, input: Partial<z.infer<typeof txSchema>>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.type !== undefined) patch.type = input.type;
  if (input.amountPaisa !== undefined) patch.amount = input.amountPaisa.toString();
  if (input.walletId !== undefined) patch.wallet_id = input.walletId;
  if (input.toWalletId !== undefined) patch.to_wallet_id = input.toWalletId || null;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId || null;
  if (input.occurredAt !== undefined) patch.occurred_at = input.occurredAt.toISOString();
  if (input.note !== undefined) patch.note = input.note || null;
  if (input.payee !== undefined) patch.payee = input.payee || null;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.attachmentPath !== undefined) patch.attachment_path = input.attachmentPath || null;
  const { error } = await supabase.from("transactions").update(patch).eq("id", id).is("deleted_at", null);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function softDeleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function restoreTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ deleted_at: null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function duplicateTransaction(id: string) {
  const supabase = await createClient();
  const { data: orig } = await supabase.from("transactions").select("*").eq("id", id).single();
  if (!orig) throw new Error("Not found");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("transactions").insert({
    book_id: orig.book_id,
    type: orig.type,
    amount: orig.amount,
    wallet_id: orig.wallet_id,
    to_wallet_id: orig.to_wallet_id,
    category_id: orig.category_id,
    occurred_at: new Date().toISOString(),
    note: orig.note,
    payee: orig.payee,
    tags: orig.tags,
    created_by: user.id,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  return data;
}

export async function bulkDeleteTransactions(ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function bulkRecategorize(ids: string[], categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ category_id: categoryId }).in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function uploadReceipt(bookId: string, file: File) {
  const supabase = await createClient();
  const path = `${bookId}/${crypto.randomUUID()}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function getReceiptUrl(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
