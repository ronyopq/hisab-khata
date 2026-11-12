import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export interface GoalWithProgress {
  id: string;
  book_id: string;
  name: string;
  target_amount: bigint;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  saved: bigint;
  contributions: { id: string; amount: bigint; contributed_at: string; note?: string | null }[];
}

/**
 * Goals plus their contributions.
 *
 * `generatedAt` is returned with the data so pages can compute "months left"
 * from a server timestamp instead of calling Date.now() while rendering (which
 * React treats as impure and which made SSR and hydration disagree).
 */
export async function getGoals(): Promise<{ goals: GoalWithProgress[]; generatedAt: string }> {
  const book = await getActiveBook();
  if (!book) return { goals: [], generatedAt: new Date().toISOString() };

  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("book_id", book.id)
    .order("created_at", { ascending: false });

  if (!goals?.length) return { goals: [], generatedAt: new Date().toISOString() };

  // One query for every contribution in the book instead of one per goal.
  const { data: contributions } = await supabase
    .from("goal_contributions")
    .select("id, goal_id, amount, contributed_at, note")
    .in("goal_id", goals.map((g) => g.id))
    .order("contributed_at", { ascending: false });

  const byGoal = new Map<string, { id: string; amount: bigint; contributed_at: string; note?: string | null }[]>();
  for (const c of contributions ?? []) {
    const list = byGoal.get(c.goal_id) ?? [];
    list.push({ id: c.id, amount: BigInt(c.amount), contributed_at: c.contributed_at, note: c.note });
    byGoal.set(c.goal_id, list);
  }

  const result: GoalWithProgress[] = goals.map((g) => {
    const list = byGoal.get(g.id) ?? [];
    const saved = list.reduce((sum, c) => sum + c.amount, BigInt(0));
    return {
      ...g,
      target_amount: BigInt(g.target_amount),
      saved,
      contributions: list,
    };
  });

  return { goals: result, generatedAt: new Date().toISOString() };
}
