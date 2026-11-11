import { getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/queries/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DynamicIcon } from "@/components/forms/IconPicker";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function CategoriesPage() {
  const t = await getTranslations("nav");
  const [expense, income] = await Promise.all([getCategories("expense"), getCategories("income")]);

  const renderList = (items: Awaited<ReturnType<typeof getCategories>>, title: string) => (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {items.length === 0 ? (
        <EmptyState title="No categories" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className={c.is_archived ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${c.color ?? "#10b981"}20`, color: c.color ?? "#10b981" }}>
                  <DynamicIcon name={c.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name_bn}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.name_en}</p>
                </div>
                {c.is_archived && <Badge variant="secondary">Archived</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("categories")}</h1>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Category</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader><CategoryForm /></DialogContent>
        </Dialog>
      </div>
      {renderList(expense, "Expense / ব্যয়")}
      {renderList(income, "Income / আয়")}
    </div>
  );
}
