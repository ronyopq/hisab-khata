import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export async function getGoals() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data: goals } = await supabase.from("goals").select("*").eq("book_id", book.id).order("created_at", { ascending: false });
  const result = [];
  for (const g of goals ?? []) {
    const { data: contribs } = await supabase.from("goal_contributions").select("*").eq("goal_id", g.id).order("contributed_at", { ascending: false });
    const saved = (contribs ?? []).reduce((s, c) => s + BigInt(c.amount), BigInt(0));
    result.push({ ...g, saved, contributions: contribs ?? [] });
  }
  return result;
}
