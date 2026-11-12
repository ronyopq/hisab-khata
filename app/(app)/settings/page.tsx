import { getTranslations } from "next-intl/server";
import { getAllTransactionsForExport } from "@/lib/queries/reports";
import { getWalletsWithMeta } from "@/lib/queries/wallets";
import { getCategories } from "@/lib/queries/categories";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { ImportWizard } from "@/components/reports/ImportWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChangePasswordForm, DeleteAccountForm } from "@/components/auth/SettingsAuthForms";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { AppLockSettings } from "@/components/auth/AppLockProvider";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("*").eq("id", user.id).single() : { data: null };
  const [allTx, wallets, categories] = await Promise.all([getAllTransactionsForExport(), getWalletsWithMeta(), getCategories()]);
  const exportRows = allTx.map((tx) => ({ date: tx.occurred_at, type: tx.type, amount_taka: Number(BigInt(tx.amount)) / 100, note: tx.note ?? "" }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader><CardTitle>{t("language")}</CardTitle></CardHeader>
        <CardContent>
          <PreferencesForm
            initial={{
              locale: (profile?.locale ?? "bn") as "bn" | "en",
              digitStyle: (profile?.digit_style ?? "bengali") as "bengali" | "latin",
              numberGrouping: (profile?.number_grouping ?? "lakh") as "lakh" | "international",
              hideAmounts: Boolean(profile?.hide_amounts),
              defaultWalletId: profile?.default_wallet_id ?? null,
            }}
            wallets={(wallets ?? []).map((w) => ({ id: w.id, name: w.name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("appLock")}</CardTitle></CardHeader>
        <CardContent>
          <AppLockSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("export")} / {t("import")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ExportButtons rows={exportRows} />
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">Import CSV with Column Mapping</Button></DialogTrigger>
            <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Import CSV</DialogTitle></DialogHeader><ImportWizard wallets={wallets as never} categories={categories as never} /></DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-destructive">{t("deleteAccount")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Delete your account and all data. This cannot be undone.</p>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
