"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithPassword, signUp, signInWithGoogle, signInWithMagicLink, requestPasswordReset, updatePassword } from "@/lib/auth/actions";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const signupSchema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(6) });

/** Same-site absolute paths only — blocks open-redirect via ?next=//evil.com */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const [loading, setLoading] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    const fd = new FormData();
    fd.set("email", data.email);
    fd.set("password", data.password);
    const result = await signInWithPassword(fd);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.push(nextPath);
    router.refresh();
  });

  const onGoogle = async () => {
    const result = await signInWithGoogle();
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.url) window.location.href = result.url;
  };

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) return;
    setMagicLoading(true);
    const fd = new FormData();
    fd.set("email", magicEmail);
    const result = await signInWithMagicLink(fd);
    setMagicLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("checkEmail"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("login")}</CardTitle>
        <CardDescription>হিসাব খাতা — {t("login")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
          </div>
          <Button className="w-full" disabled={loading}>{loading ? "Loading..." : t("login")}</Button>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>{t("continueWithGoogle")}</Button>
          <form onSubmit={onMagicLink} className="space-y-2">
            <Input type="email" placeholder={t("email")} value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} required />
            <Button type="submit" variant="ghost" className="w-full text-sm" disabled={magicLoading}>{t("magicLink")}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")} <a href="/signup" className="font-medium text-primary">{t("signup")}</a>
          </p>
          <p className="text-center text-sm">
            <a href="/forgot-password" className="text-primary">{t("forgotPassword")}</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    const fd = new FormData();
    fd.set("fullName", data.fullName);
    fd.set("email", data.email);
    fd.set("password", data.password);
    const result = await signUp(fd);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card>
      <CardHeader><CardTitle>{t("signup")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2"><Label>{t("fullName")}</Label><Input {...form.register("fullName")} /></div>
          <div className="space-y-2"><Label>{t("email")}</Label><Input type="email" {...form.register("email")} /></div>
          <div className="space-y-2"><Label>{t("password")}</Label><Input type="password" {...form.register("password")} /></div>
          <Button className="w-full" disabled={loading}>{loading ? "Loading..." : t("signup")}</Button>
          <p className="text-center text-sm text-muted-foreground">{t("hasAccount")} <a href="/login" className="font-medium text-primary">{t("login")}</a></p>
        </form>
      </CardContent>
    </Card>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("email", email);
    const result = await requestPasswordReset(fd);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("checkEmail"));
  };

  return (
    <Card>
      <CardHeader><CardTitle>{t("forgotPassword")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button className="w-full" disabled={loading}>{loading ? "Loading..." : t("resetPassword")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResetForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("password", password);
    const result = await updatePassword(fd);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle>{t("resetPassword")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button className="w-full" disabled={loading}>{loading ? "Loading..." : t("resetPassword")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
