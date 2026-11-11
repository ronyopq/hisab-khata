import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/auth/actions";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Book Invitation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">You have been invited to join a book. Token: <code className="text-xs">{token.slice(0, 12)}…</code></p>
          <form action={acceptInviteAction.bind(null, token)}>
            <Button className="w-full">Accept Invitation</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
