"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBook, inviteMember } from "@/lib/actions/books";
import { toast } from "sonner";

export function BookForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createBook({ name, currency: "BDT" }); toast.success("Book created"); onDone?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Book Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="পরিবার / Family" required /></div>
      <Button className="w-full">Create Book</Button>
    </form>
  );
}

export function InviteForm({ bookId, onDone }: { bookId: string; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [link, setLink] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await inviteMember({ bookId, email, role });
      setLink(res.inviteLink);
      toast.success("Invite created");
      onDone?.();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Role</Label><Select value={role} onValueChange={(v: string) => setRole(v as never)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Viewer (read-only)</SelectItem><SelectItem value="editor">Editor (read + write)</SelectItem><SelectItem value="owner">Owner (full)</SelectItem></SelectContent></Select></div>
      <Button className="w-full">Send Invite</Button>
      {link && <div className="rounded-xl bg-muted p-3 text-xs break-all">Shareable link: {link}</div>}
    </form>
  );
}
