"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useRouter } from "next/navigation";

interface Props {
  data: { id: string; name_bn: string; name_en: string; color: string | null; total: string }[];
  locale?: "bn" | "en";
}

export function CategoryDonut({ data, locale = "bn" }: Props) {
  const router = useRouter();
  const chartData = data
    .filter((d) => BigInt(d.total) > BigInt(0))
    .map((d) => ({
      id: d.id,
      name: locale === "bn" ? d.name_bn : d.name_en,
      value: Number(BigInt(d.total)) / 100,
      color: d.color ?? "#10b981",
    }));

  if (chartData.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No expense data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={2}
          onClick={(d) => router.push(`/transactions?category=${(d as { id?: string }).id ?? ""}`)}
          className="cursor-pointer"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `৳ ${Number(v).toLocaleString("bn-BD")}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
