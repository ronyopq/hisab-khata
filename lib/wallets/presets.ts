/**
 * Wallet presets shared by the client form and the server action.
 *
 * These used to live in lib/actions/wallets.ts, but a "use server" module may
 * only export async functions — a plain array export breaks the module contract
 * and can serialize the whole object graph to the client.
 */
export const WALLET_PRESETS = [
  { name: "Cash", type: "cash" as const, provider: undefined, icon: "Banknote", color: "#10b981" },
  { name: "Bank", type: "bank" as const, provider: undefined, icon: "Landmark", color: "#3b82f6" },
  { name: "bKash", type: "mobile_banking" as const, provider: "bKash", icon: "Smartphone", color: "#e2136e" },
  { name: "Nagad", type: "mobile_banking" as const, provider: "Nagad", icon: "Smartphone", color: "#f6921e" },
  { name: "Rocket", type: "mobile_banking" as const, provider: "Rocket", icon: "Smartphone", color: "#8c3494" },
  { name: "Upay", type: "mobile_banking" as const, provider: "Upay", icon: "Smartphone", color: "#00a651" },
  { name: "Card", type: "card" as const, provider: undefined, icon: "CreditCard", color: "#6366f1" },
  { name: "Savings", type: "savings" as const, provider: undefined, icon: "PiggyBank", color: "#f59e0b" },
] as const;

export type WalletPreset = (typeof WALLET_PRESETS)[number];
