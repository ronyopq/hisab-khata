"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const walletSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["cash", "bank", "mobile_banking", "card", "savings", "other"]),
  provider: z.string().max(60).optional(),
  openingBalancePaisa: z.bigint().default(BigInt(0)),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// Presets moved to lib/wallets/presets.ts (a "use server" file may only export async functions).


export async function createWallet(input: z.infer<typeof walletSchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("wallets").insert({
    book_id: book.id,
    name: input.name,
    type: input.type,
    provider: input.provider || null,
    opening_balance: input.openingBalancePaisa.toString(),
    color: input.color || null,
    icon: input.icon || null,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  return data;
}

export async function updateWallet(id: string, input: Partial<z.infer<typeof walletSchema>>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.provider !== undefined) patch.provider = input.provider || null;
  if (input.openingBalancePaisa !== undefined) patch.opening_balance = input.openingBalancePaisa.toString();
  if (input.color !== undefined) patch.color = input.color || null;
  if (input.icon !== undefined) patch.icon = input.icon || null;
  const { error } = await supabase.from("wallets").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wallets");
}

export async function archiveWallet(id: string, archived = true) {
  const supabase = await createClient();
  const { error } = await supabase.from("wallets").update({ is_archived: archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wallets");
}

export async function reorderWallets(orderedIds: string[]) {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase.from("wallets").update({ sort_order: i }).eq("id", orderedIds[i]);
  }
  revalidatePath("/wallets");
}

export async function createTransfer(input: { fromWalletId: string; toWalletId: string; amountPaisa: bigint; occurredAt: Date; note?: string }) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  if (input.fromWalletId === input.toWalletId) throw new Error("Same wallet");
  if (input.amountPaisa <= BigInt(0)) throw new Error("Amount must be positive");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("transactions").insert({
    book_id: book.id,
    type: "transfer",
    amount: input.amountPaisa.toString(),
    wallet_id: input.fromWalletId,
    to_wallet_id: input.toWalletId,
    category_id: null,
    occurred_at: input.occurredAt.toISOString(),
    note: input.note || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}
