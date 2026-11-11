import { z } from "zod";

// Shared client/server schemas. Error messages keyed for translation via custom error map.
export const emailSchema = z.string().email("validation.invalidEmail");
export const passwordSchema = z.string().min(6, "validation.minLength");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  fullName: z.string().min(2, "validation.required"),
  email: emailSchema,
  password: passwordSchema,
});

export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amountPaisa: z.bigint().positive("validation.amountPositive"),
  walletId: z.string().uuid(),
  toWalletId: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  occurredAt: z.date(),
  note: z.string().max(500).optional(),
  payee: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export const walletSchema = z.object({
  name: z.string().min(1, "validation.required").max(60),
  type: z.enum(["cash", "bank", "mobile_banking", "card", "savings", "other"]),
  provider: z.string().max(60).optional(),
  openingBalancePaisa: z.bigint().default(BigInt(0)),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const categorySchema = z.object({
  nameBn: z.string().min(1, "validation.required").max(60),
  nameEn: z.string().min(1, "validation.required").max(60),
  type: z.enum(["income", "expense"]),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type WalletInput = z.infer<typeof walletSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
