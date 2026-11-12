import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Gate first: a plain signed-in user must not reach the service-role client.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  // 404 rather than 403 so the route's existence is not advertised.
  if (!me?.is_admin) notFound();

  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, full_name, is_admin, created_at").order("created_at", { ascending: false }).limit(50);
  const { count: bookCount } = await admin.from("books").select("*", { count: "exact", head: true });
  const totalUsers = profiles?.length ?? 0;
  const activeUsers = profiles?.filter((p) => !p.is_admin).length ?? 0;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Users", value: String(totalUsers) },
          { label: "Active Users", value: String(activeUsers) },
          { label: "Admins", value: String(profiles?.filter((p) => p.is_admin).length ?? 0) },
          { label: "Books", value: String(bookCount ?? 0) },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(profiles ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-semibold">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">{p.id.slice(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-2">
                {p.is_admin && <Badge>Admin</Badge>}
                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-GB")}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
