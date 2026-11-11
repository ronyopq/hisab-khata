export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/30 dark:to-background p-4"><div className="w-full max-w-md">{children}</div></div>;
}
