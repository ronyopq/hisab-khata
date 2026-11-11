import { getNotifications, markAllRead } from "@/lib/actions/notifications";
import { formatRelative } from "@/lib/format/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function NotificationsPage() {
  const notifications = await getNotifications(30);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <form action={markAllRead}><Button variant="outline" size="sm">Mark all read</Button></form>
      </div>
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="Budget alerts, recurring reminders and debt dues appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : ""}>
              <CardContent className="flex gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Bell className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
