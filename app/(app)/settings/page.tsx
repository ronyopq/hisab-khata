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
import { changePassword, deleteAccount } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";

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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <Select defaultValue={profile?.locale ?? "bn"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="bn">বাংলা</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("digitStyle")}</Label>
            <Select defaultValue={profile?.digit_style ?? "bengali"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="bengali">{t("bengaliDigits")}</SelectItem><SelectItem value="latin">{t("latinDigits")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("grouping")}</Label>
            <Select defaultValue={profile?.number_grouping ?? "lakh"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="lakh">{t("lakh")}</SelectItem><SelectItem value="international">{t("international")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between"><Label>{t("hideAmounts")}</Label><Switch defaultChecked={profile?.hide_amounts ?? false} /></div>
          <div className="space-y-2">
            <Label>{t("defaultWallet")}</Label>
            <Select defaultValue={profile?.default_wallet_id ?? ""}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between"><Label>{t("appLock")} (4-digit PIN, 5 min)</Label><Switch /></div>
          <p className="text-xs text-muted-foreground">TOTP 2FA: Supabase MFA enabled — enroll via Supabase Auth (mfa_totp_enroll_enabled=true). App-lock PIN stored hashed locally.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form action={changePassword} className="flex gap-2">
            <Input name="newPassword" type="password" placeholder="New password (min 6 chars)" required />
            <Button type="submit">Change</Button>
          </form>
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
          <form action={deleteAccount} className="mt-3">
            <Button variant="destructive" type="submit">Delete Account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
