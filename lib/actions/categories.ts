"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "@/lib/queries/books";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const categorySchema = z.object({
  nameBn: z.string().min(1).max(60),
  nameEn: z.string().min(1).max(60),
  type: z.enum(["income", "expense"]),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function createCategory(input: z.infer<typeof categorySchema>) {
  const book = await getActiveBook();
  if (!book) throw new Error("No active book");
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").insert({
    book_id: book.id,
    name_bn: input.nameBn,
    name_en: input.nameEn,
    type: input.type,
    parent_id: input.parentId || null,
    icon: input.icon || null,
    color: input.color || null,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  return data;
}

export async function updateCategory(id: string, input: Partial<z.infer<typeof categorySchema>>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.nameBn !== undefined) patch.name_bn = input.nameBn;
  if (input.nameEn !== undefined) patch.name_en = input.nameEn;
  if (input.type !== undefined) patch.type = input.type;
  if (input.parentId !== undefined) patch.parent_id = input.parentId || null;
  if (input.icon !== undefined) patch.icon = input.icon || null;
  if (input.color !== undefined) patch.color = input.color || null;
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

export async function archiveCategory(id: string, archived = true) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ is_archived: archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

export async function mergeCategory(sourceId: string, targetId: string) {
  const supabase = await createClient();
  const { error: txError } = await supabase.from("transactions").update({ category_id: targetId }).eq("category_id", sourceId);
  if (txError) throw new Error(txError.message);
  const { error: budgetError } = await supabase.from("budgets").update({ category_id: targetId }).eq("category_id", sourceId);
  if (budgetError) throw new Error(budgetError.message);
  await supabase.from("categories").update({ is_archived: true }).eq("id", sourceId);
  revalidatePath("/categories");
}

export async function reorderCategories(orderedIds: string[]) {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase.from("categories").update({ sort_order: i }).eq("id", orderedIds[i]);
  }
  revalidatePath("/categories");
}
