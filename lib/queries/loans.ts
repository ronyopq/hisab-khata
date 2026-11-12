import { createClient } from "@/lib/supabase/server";
import { getActiveBook } from "./books";

export async function getContacts() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("contacts").select("*").eq("book_id", book.id).order("name");
  return data ?? [];
}

export async function getDebts() {
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("debt_balances").select("*, debts:debt_id(*, contacts:contact_id(name, phone))").eq("book_id", book.id).order("due_at", { nullsFirst: false });
  return data ?? [];
}

export async function getDebtPayments(debtId: string) {
  // Scope through the parent debt so an id from a non-active book is not readable.
  const book = await getActiveBook();
  if (!book) return [];
  const supabase = await createClient();
  const { data: debt } = await supabase
    .from("debts")
    .select("id")
    .eq("id", debtId)
    .eq("book_id", book.id)
    .maybeSingle();
  if (!debt) return [];
  const { data } = await supabase.from("debt_payments").select("*").eq("debt_id", debt.id).order("paid_at", { ascending: false });
  return data ?? [];
}
