import { getTranslations } from "next-intl/server";
import { getMyBooks, getActiveBook, getBookMembers, getBookInvites, getActivityLog } from "@/lib/queries/books";
import { formatRelative } from "@/lib/format/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookForm, InviteForm } from "@/components/books/BookForms";
import { RealtimeListener } from "@/components/books/RealtimeListener";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { switchActiveBook } from "@/lib/actions/books";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function BooksPage() {
  const t = await getTranslations("nav");
  const [myBooks, activeBook] = await Promise.all([getMyBooks(), getActiveBook()]);
  const members = activeBook ? await getBookMembers(activeBook.id) : [];
  const invites = activeBook ? await getBookInvites(activeBook.id) : [];
  const activity = activeBook ? await getActivityLog(activeBook.id) : [];

  return (
    <div className="space-y-5">
      {activeBook && <RealtimeListener bookId={activeBook.id} />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("books")}</h1>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New Book</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>New Book</DialogTitle></DialogHeader><BookForm /></DialogContent>
        </Dialog>
      </div>

      {myBooks.length === 0 ? (
        <EmptyState title="No books" description="Create your first book." actionLabel="New Book" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myBooks.map((m) => {
            const book = m.books as unknown as { id: string; name: string; currency: string };
            const isActive = activeBook?.id === book.id;
            return (
              <Card key={book.id} className={isActive ? "border-primary" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{book.name}</p>
                      <p className="text-xs text-muted-foreground">{book.currency}</p>
                    </div>
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
                  </div>
                  <form action={switchActiveBook.bind(null, book.id)} className="mt-4">
                    <Button variant={isActive ? "secondary" : "default"} className="w-full" disabled={isActive}>
                      {isActive ? <><Check className="h-4 w-4" /> Active</> : "Switch to this book"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeBook && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Members — {activeBook.name}</CardTitle>
              <Dialog>
                <DialogTrigger asChild><Button size="sm">Invite</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader><InviteForm bookId={activeBook.id} /></DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback>{(m.profiles as { full_name: string } | null)?.full_name?.slice(0, 1) ?? "?"}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-semibold">{(m.profiles as { full_name: string } | null)?.full_name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatRelative(m.joined_at)}</p>
                    </div>
                  </div>
                  <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {invites.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Pending Invites</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div><p className="text-sm font-semibold">{inv.email}</p><p className="text-xs text-muted-foreground">{inv.role} • Expires {formatRelative(inv.expires_at)}</p></div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet</p>}
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>{(a.profiles as { full_name: string } | null)?.full_name} • {a.action}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(a.created_at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
