"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword, deleteAccount } from "@/lib/auth/actions";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("newPassword", password);
    const result = await changePassword(fd);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Password changed");
    setPassword("");
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input type="password" placeholder="New password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Button type="submit" disabled={loading}>{loading ? "Loading..." : "Change"}</Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await deleteAccount();
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <Button variant="destructive" type="submit" disabled={loading}>{loading ? "Loading..." : "Delete Account"}</Button>
    </form>
  );
}
