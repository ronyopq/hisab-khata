"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const goalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmountPaisa: z.bigint().positive(),
  deadline: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function createGoal(input: z.infer<typeof goalSchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").insert({
    book_id: book.id,
    name: input.name,
    target_amount: input.targetAmountPaisa.toString(),
    deadline: input.deadline || null,
    icon: input.icon || null,
    color: input.color || null,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return data;
}

export async function addContribution(input: { goalId: string; amountPaisa: bigint; walletId?: string; contributedAt: Date }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goal_contributions").insert({
    goal_id: input.goalId,
    amount: input.amountPaisa.toString(),
    wallet_id: input.walletId || null,
    contributed_at: input.contributedAt.toISOString(),
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return data;
}

export async function updateGoalStatus(id: string, status: "active" | "completed" | "archived") {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}
