-- Hisab Khata — 003 Finance Tables (wallets, categories, transactions, budgets, recurring_rules)

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  name text NOT NULL,
  type wallet_type NOT NULL DEFAULT 'cash',
  provider text,
  opening_balance bigint NOT NULL DEFAULT 0,
  color text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  type category_type NOT NULL,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  icon text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  to_wallet_id uuid REFERENCES public.wallets(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text,
  payee text,
  tags text[] NOT NULL DEFAULT '{}',
  attachment_path text,
  recurring_rule_id uuid,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT tx_transfer_check CHECK (
    (type = 'transfer' AND to_wallet_id IS NOT NULL AND category_id IS NULL AND wallet_id <> to_wallet_id)
    OR (type IN ('income','expense') AND to_wallet_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  month date NOT NULL,
  rollover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  note text,
  frequency recurring_frequency NOT NULL,
  interval integer NOT NULL DEFAULT 1 CHECK (interval >= 1),
  next_run_at timestamptz NOT NULL,
  end_at timestamptz,
  mode recurring_mode NOT NULL DEFAULT 'remind_only',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Now that transactions + recurring_rules exist, add FK for recurring_rule_id
DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_recurring_fk
    FOREIGN KEY (recurring_rule_id) REFERENCES public.recurring_rules(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles FKs to wallets/books
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_default_wallet_fk
    FOREIGN KEY (default_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_active_book_fk
    FOREIGN KEY (active_book_id) REFERENCES public.books(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Budget uniqueness: overall (NULL category) + per-category
CREATE UNIQUE INDEX IF NOT EXISTS budgets_overall_uniq
  ON public.budgets (book_id, month) WHERE category_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_category_uniq
  ON public.budgets (book_id, category_id, month) WHERE category_id IS NOT NULL;
