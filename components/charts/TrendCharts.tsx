"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from "recharts";

export function MonthlyBarChart({ data }: { data: { month: string; income: string; expense: string }[] }) {
  const chartData = data.map((d) => ({
    month: new Date(d.month).toLocaleDateString("bn-BD", { month: "short" }),
    income: Number(BigInt(d.income)) / 100,
    expense: Number(BigInt(d.expense)) / 100,
  }));
  if (chartData.length === 0) return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => `৳ ${Number(v).toLocaleString("bn-BD")}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" fill="var(--income)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" fill="var(--expense)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyAreaChart({ data }: { data: { day: string; income: string; expense: string }[] }) {
  const chartData = data.map((d) => ({
    day: new Date(d.day).getDate().toString(),
    income: Number(BigInt(d.income)) / 100,
    expense: Number(BigInt(d.expense)) / 100,
  }));
  if (chartData.length === 0) return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => `৳ ${Number(v).toLocaleString("bn-BD")}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="income" stroke="var(--income)" fill="var(--income)" fillOpacity={0.2} />
        <Area type="monotone" dataKey="expense" stroke="var(--expense)" fill="var(--expense)" fillOpacity={0.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
