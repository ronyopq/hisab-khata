"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateProfile, type ProfilePatch } from "@/lib/actions/profile";
import { setLocale } from "@/lib/i18n/actions";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function PreferencesForm({
  initial,
  wallets,
}: {
  initial: {
    locale: "bn" | "en";
    digitStyle: "bengali" | "latin";
    numberGrouping: "lakh" | "international";
    hideAmounts: boolean;
    defaultWalletId: string | null;
  };
  wallets: { id: string; name: string }[];
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initial);

  const save = (patch: ProfilePatch) => {
    // Optimistic write, then persist. Failures roll the control back.
    const previous = values;
    setValues((v) => ({ ...v, ...patch }));
    startTransition(async () => {
      try {
        await updateProfile(patch);
        if (patch.locale) await setLocale(patch.locale);
        toast.success(t("saved"));
        router.refresh();
      } catch (e) {
        setValues(previous);
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("language")}</Label>
        <Select value={values.locale} onValueChange={(v: string) => save({ locale: v as "bn" | "en" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bn">বাংলা</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("digitStyle")}</Label>
        <Select value={values.digitStyle} onValueChange={(v: string) => save({ digitStyle: v as "bengali" | "latin" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bengali">{t("bengaliDigits")}</SelectItem>
            <SelectItem value="latin">{t("latinDigits")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("grouping")}</Label>
        <Select value={values.numberGrouping} onValueChange={(v: string) => save({ numberGrouping: v as "lakh" | "international" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lakh">{t("lakh")}</SelectItem>
            <SelectItem value="international">{t("international")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="hide-amounts">{t("hideAmounts")}</Label>
        <Switch
          id="hide-amounts"
          checked={values.hideAmounts}
          onCheckedChange={(checked: boolean) => save({ hideAmounts: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("defaultWallet")}</Label>
        <Select
          value={values.defaultWalletId ?? "none"}
          onValueChange={(v: string) => save({ defaultWalletId: v === "none" ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {pending && <p className="text-xs text-muted-foreground">Saving…</p>}
    </div>
  );
}
