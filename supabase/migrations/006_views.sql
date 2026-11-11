-- Hisab Khata — 006 Views

CREATE OR REPLACE VIEW public.wallet_balances AS
SELECT
  w.id AS wallet_id,
  w.book_id,
  w.name,
  w.type,
  w.provider,
  w.color,
  w.icon,
  w.is_archived,
  w.opening_balance
    + COALESCE(SUM(
        CASE
          WHEN t.type = 'income' AND t.wallet_id = w.id THEN t.amount
          WHEN t.type = 'expense' AND t.wallet_id = w.id THEN -t.amount
          WHEN t.type = 'transfer' AND t.wallet_id = w.id THEN -t.amount
          WHEN t.type = 'transfer' AND t.to_wallet_id = w.id THEN t.amount
          ELSE 0
        END
      ), 0) AS balance
FROM public.wallets w
LEFT JOIN public.transactions t
  ON t.deleted_at IS NULL AND (t.wallet_id = w.id OR t.to_wallet_id = w.id)
GROUP BY w.id;

CREATE OR REPLACE VIEW public.debt_balances AS
SELECT
  d.id AS debt_id,
  d.book_id,
  d.contact_id,
  d.direction,
  d.amount AS principal,
  COALESCE(SUM(dp.amount), 0) AS paid,
  d.amount - COALESCE(SUM(dp.amount), 0) AS remaining,
  d.status,
  d.due_at
FROM public.debts d
LEFT JOIN public.debt_payments dp ON dp.debt_id = d.id
GROUP BY d.id;

CREATE OR REPLACE VIEW public.budget_usage AS
SELECT
  b.id AS budget_id,
  b.book_id,
  b.category_id,
  b.month,
  b.amount AS budget_amount,
  COALESCE(SUM(t.amount), 0) AS spent
FROM public.budgets b
LEFT JOIN public.transactions t
  ON t.book_id = b.book_id
  AND t.deleted_at IS NULL
  AND t.type = 'expense'
  AND date_trunc('month', t.occurred_at)::date = b.month
  AND (b.category_id IS NULL OR t.category_id = b.category_id)
GROUP BY b.id;
