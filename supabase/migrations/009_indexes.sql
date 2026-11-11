-- Hisab Khata — 009 Indexes

CREATE INDEX IF NOT EXISTS books_owner_idx ON public.books (owner_id);
CREATE INDEX IF NOT EXISTS book_members_user_idx ON public.book_members (user_id);
CREATE INDEX IF NOT EXISTS book_invites_token_idx ON public.book_invites (token);
CREATE INDEX IF NOT EXISTS book_invites_book_email_idx ON public.book_invites (book_id, email) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS wallets_book_idx ON public.wallets (book_id, is_archived, sort_order);
CREATE INDEX IF NOT EXISTS categories_book_type_idx ON public.categories (book_id, type, is_archived, sort_order);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories (parent_id);

CREATE INDEX IF NOT EXISTS transactions_book_occurred_idx ON public.transactions (book_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS transactions_book_type_idx ON public.transactions (book_id, type, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS transactions_wallet_idx ON public.transactions (wallet_id);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS transactions_tags_gin_idx ON public.transactions USING GIN (tags);
CREATE INDEX IF NOT EXISTS transactions_search_trgm ON public.transactions USING GIN (note gin_trgm_ops, payee gin_trgm_ops);

CREATE INDEX IF NOT EXISTS budgets_book_month_idx ON public.budgets (book_id, month);
CREATE INDEX IF NOT EXISTS recurring_next_run_idx ON public.recurring_rules (next_run_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS contacts_book_idx ON public.contacts (book_id);
CREATE INDEX IF NOT EXISTS debts_book_status_idx ON public.debts (book_id, status, due_at);
CREATE INDEX IF NOT EXISTS debt_payments_debt_idx ON public.debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS goals_book_idx ON public.goals (book_id, status);
CREATE INDEX IF NOT EXISTS goal_contributions_goal_idx ON public.goal_contributions (goal_id);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS activity_logs_book_created_idx ON public.activity_logs (book_id, created_at DESC);
