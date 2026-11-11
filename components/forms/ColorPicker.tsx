"use client";

const COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f43f5e", "#64748b", "#14b8a6", "#eab308"];

export function ColorPicker({ value, onChange }: { value?: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className={`h-10 w-10 rounded-full border-2 transition-all active:scale-90 ${value === c ? "border-foreground scale-110" : "border-transparent"}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
