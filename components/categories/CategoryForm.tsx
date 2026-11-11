"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPicker } from "@/components/forms/IconPicker";
import { ColorPicker } from "@/components/forms/ColorPicker";
import { createCategory } from "@/lib/actions/categories";
import { toast } from "sonner";

const schema = z.object({
  nameBn: z.string().min(1),
  nameEn: z.string().min(1),
  type: z.enum(["income", "expense"]),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export function CategoryForm({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { nameBn: "", nameEn: "", type: "expense", icon: "Tag", color: "#10b981" } });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      await createCategory(data);
      toast.success("Category created");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>বাংলা নাম</Label><Input {...form.register("nameBn")} placeholder="খাবার" /></div>
        <div className="space-y-2"><Label>English Name</Label><Input {...form.register("nameEn")} placeholder="Food" /></div>
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={form.watch("type")} onValueChange={(v: string) => form.setValue("type", v as never)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="expense">Expense / ব্যয়</SelectItem><SelectItem value="income">Income / আয়</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Icon</Label><IconPicker value={form.watch("icon")} onChange={(icon) => form.setValue("icon", icon)} /></div>
      <div className="space-y-2"><Label>Color</Label><ColorPicker value={form.watch("color")} onChange={(c) => form.setValue("color", c)} /></div>
      <Button className="w-full" disabled={loading}>{loading ? "Saving..." : "Create Category"}</Button>
    </form>
  );
}
