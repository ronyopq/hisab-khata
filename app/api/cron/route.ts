import { NextResponse } from "next/server";
import { processRecurring } from "@/lib/actions/recurring";
import { checkBudgetAlerts } from "@/lib/actions/budgets";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel Hobby caps function execution; keep the job bounded.
export const maxDuration = 60;

/**
 * Vercel Cron (0 0 * * *) and manual runs.
 * Previously: `auth !== `Bearer ${undefined}`` matched a literal "Bearer undefined",
 * and the matcher redirected /api/cron to /login, so this never ran at all.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed: an unset secret must never mean "open to the world".
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  // Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when the
  // env var exists. Do NOT trust the x-vercel-cron header — any client can send it.
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recurring = await processRecurring();

    const admin = createAdminClient();
    const { data: books } = await admin.from("books").select("id");

    let budgetsChecked = 0;
    for (const b of books ?? []) {
      // checkBudgetAlerts needs the caller to be a member when it runs through RLS,
      // so the cron path passes the service-role client explicitly.
      await checkBudgetAlerts(b.id, { client: admin });
      budgetsChecked++;

      // Debt due within 3 days → notify members, de-duplicated per debt+day.
      const in3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const { data: dueDebts } = await admin
        .from("debts")
        .select("id, book_id, due_at")
        .eq("book_id", b.id)
        .eq("status", "open")
        .lte("due_at", in3);

      if (!dueDebts?.length) continue;

      const { data: members } = await admin.from("book_members").select("user_id").eq("book_id", b.id);
      for (const d of dueDebts) {
        for (const m of members ?? []) {
          // dedupe_key + unique index ⇒ re-running the cron never spams twice a day.
          await admin.from("notifications").upsert(
            {
              user_id: m.user_id,
              book_id: b.id,
              type: "debt_due",
              title: "Debt due soon",
              body: "A loan is due within 3 days",
              data: { debt_id: d.id },
              dedupe_key: `debt_due:${d.id}:${today}`,
            },
            { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      recurring,
      budgetsChecked,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Cron failed" }, { status: 500 });
  }
}
