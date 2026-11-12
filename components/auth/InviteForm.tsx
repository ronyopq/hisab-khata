"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/auth/actions";
import { toast } from "sonner";

export function InviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await acceptInviteAction(token);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit}>
      <Button className="w-full" disabled={loading}>{loading ? "Loading..." : "Accept Invitation"}</Button>
    </form>
  );
}
