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

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const signupSchema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(6) });

export function LoginForm() {
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("email", data.email);
      fd.set("password", data.password);
      await signInWithPassword(fd);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  });

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
          <Button type="button" variant="outline" className="w-full" onClick={() => signInWithGoogle()}>{t("continueWithGoogle")}</Button>
          <form action={signInWithMagicLink} className="space-y-2">
            <Input name="email" type="email" placeholder={t("email")} />
            <Button variant="ghost" className="w-full text-sm">{t("magicLink")}</Button>
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
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("fullName", data.fullName);
      fd.set("email", data.email);
      fd.set("password", data.password);
      await signUp(fd);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signup failed");
      setLoading(false);
    }
  });

  return (
    <Card>
      <CardHeader><CardTitle>{t("signup")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2"><Label>{t("fullName")}</Label><Input {...form.register("fullName")} /></div>
          <div className="space-y-2"><Label>{t("email")}</Label><Input type="email" {...form.register("email")} /></div>
          <div className="space-y-2"><Label>{t("password")}</Label><Input type="password" {...form.register("password")} /></div>
          <Button className="w-full" disabled={loading}>{t("signup")}</Button>
          <p className="text-center text-sm text-muted-foreground">{t("hasAccount")} <a href="/login" className="font-medium text-primary">{t("login")}</a></p>
        </form>
      </CardContent>
    </Card>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  return (
    <Card>
      <CardHeader><CardTitle>{t("forgotPassword")}</CardTitle></CardHeader>
      <CardContent>
        <form action={requestPasswordReset} className="space-y-4">
          <Input name="email" type="email" placeholder={t("email")} required />
          <Button className="w-full">{t("resetPassword")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResetForm() {
  const t = useTranslations("auth");
  return (
    <Card>
      <CardHeader><CardTitle>{t("resetPassword")}</CardTitle></CardHeader>
      <CardContent>
        <form action={updatePassword} className="space-y-4">
          <Input name="password" type="password" placeholder={t("password")} required />
          <Button className="w-full">{t("resetPassword")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
