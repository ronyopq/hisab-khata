import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminPage() {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, full_name, is_admin, created_at").order("created_at", { ascending: false }).limit(50);
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
          { label: "Books", value: "—" },
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
                <button className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent min-h-9">Disable</button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
