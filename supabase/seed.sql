-- Hisab Khata — Seed (demo data for local dev only)
-- Real users get defaults via handle_new_user trigger. This file is for manual demo.

-- Example: create demo book + wallet + categories for an existing user
-- Replace <user-id> with a real auth.users id, or run via service role.

-- NOTE: Do NOT run in production. Demo only.

-- INSERT INTO public.books (name, currency, owner_id)
-- VALUES ('Demo Book', 'BDT', '<user-id>');

-- Wallet presets: Cash, Bank, bKash, Nagad, Rocket, Upay, Card, Savings
-- INSERT INTO public.wallets (book_id, name, type, provider, opening_balance, sort_order) VALUES
--   ('<book-id>', 'Cash', 'cash', NULL, 0, 0),
--   ('<book-id>', 'Bank', 'bank', 'DBBL', 0, 1),
--   ('<book-id>', 'bKash', 'mobile_banking', 'bKash', 0, 2),
--   ('<book-id>', 'Nagad', 'mobile_banking', 'Nagad', 0, 3),
--   ('<book-id>', 'Rocket', 'mobile_banking', 'Rocket', 0, 4),
--   ('<book-id>', 'Upay', 'mobile_banking', 'Upay', 0, 5),
--   ('<book-id>', 'Card', 'card', NULL, 0, 6),
--   ('<book-id>', 'Savings', 'savings', NULL, 0, 7);
