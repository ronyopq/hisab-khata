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

const contributionSchema = z.object({
  goalId: z.string().uuid(),
  amountPaisa: z.bigint().positive(),
  walletId: z.string().uuid().nullable().optional(),
  contributedAt: z.date(),
});

export async function addContribution(input: { goalId: string; amountPaisa: bigint; walletId?: string; contributedAt: Date }) {
  const parsed = contributionSchema.safeParse({
    goalId: input.goalId,
    amountPaisa: input.amountPaisa,
    walletId: input.walletId || null,
    contributedAt: input.contributedAt,
  });
  if (!parsed.success) throw new Error("Invalid contribution");

  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();

  const { data: goal } = await supabase
    .from("goals")
    .select("id, target_amount")
    .eq("id", parsed.data.goalId)
    .eq("book_id", book.id)
    .maybeSingle();
  if (!goal) throw new Error("Goal not found in this book");

  const { data, error } = await supabase.from("goal_contributions").insert({
    goal_id: parsed.data.goalId,
    amount: parsed.data.amountPaisa.toString(),
    wallet_id: parsed.data.walletId || null,
    contributed_at: parsed.data.contributedAt.toISOString(),
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
