import { NextResponse } from "next/server";
import { processRecurring } from "@/lib/actions/recurring";
import { checkBudgetAlerts } from "@/lib/actions/budgets";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const recurring = await processRecurring();
    // Budget alerts + debt due reminders for all books
    const admin = createAdminClient();
    const { data: books } = await admin.from("books").select("id");
    for (const b of books ?? []) {
      await checkBudgetAlerts(b.id);
      // Debt due in 3 days → notify members
      const in3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: dueDebts } = await admin.from("debts").select("id, book_id").eq("book_id", b.id).eq("status", "open").lte("due_at", in3);
      const { data: members } = await admin.from("book_members").select("user_id").eq("book_id", b.id);
      for (const d of dueDebts ?? []) {
        for (const m of members ?? []) {
          await admin.from("notifications").insert({
            user_id: m.user_id,
            book_id: b.id,
            type: "debt_due",
            title: "Debt due soon",
            body: "A loan is due within 3 days",
            data: { debt_id: d.id },
          });
        }
      }
    }
    return NextResponse.json({ ok: true, recurring, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Cron failed" }, { status: 500 });
  }
}
