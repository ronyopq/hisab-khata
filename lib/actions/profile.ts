"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

/**
 * Only these columns may be changed from the settings screen. `is_admin` is
 * deliberately absent and is additionally guarded by a database trigger.
 */
const profileSchema = z.object({
  fullName: z.string().min(1).max(80).optional(),
  locale: z.enum(["bn", "en"]).optional(),
  digitStyle: z.enum(["bengali", "latin"]).optional(),
  numberGrouping: z.enum(["lakh", "international"]).optional(),
  hideAmounts: z.boolean().optional(),
  defaultWalletId: z.string().uuid().nullable().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export type ProfilePatch = z.infer<typeof profileSchema>;

function toColumns(patch: ProfilePatch): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (patch.fullName !== undefined) columns.full_name = patch.fullName;
  if (patch.locale !== undefined) columns.locale = patch.locale;
  if (patch.digitStyle !== undefined) columns.digit_style = patch.digitStyle;
  if (patch.numberGrouping !== undefined) columns.number_grouping = patch.numberGrouping;
  if (patch.hideAmounts !== undefined) columns.hide_amounts = patch.hideAmounts;
  if (patch.defaultWalletId !== undefined) columns.default_wallet_id = patch.defaultWalletId;
  if (patch.theme !== undefined) columns.theme = patch.theme;
  return columns;
}

export async function updateProfile(patch: ProfilePatch) {
  const parsed = profileSchema.safeParse(patch);
  if (!parsed.success) throw new Error("Invalid profile settings");

  const columns = toColumns(parsed.data);
  if (Object.keys(columns).length === 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("profiles").update(columns).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
