-- Hisab Khata — 002 Core Tables (profiles, books, book_members, book_invites)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  locale locale_type NOT NULL DEFAULT 'bn',
  currency text NOT NULL DEFAULT 'BDT',
  digit_style digit_style NOT NULL DEFAULT 'bengali',
  number_grouping grouping_style NOT NULL DEFAULT 'lakh',
  theme theme_pref NOT NULL DEFAULT 'system',
  week_start smallint NOT NULL DEFAULT 6 CHECK (week_start BETWEEN 0 AND 6),
  month_start_day smallint NOT NULL DEFAULT 1 CHECK (month_start_day BETWEEN 1 AND 28),
  hide_amounts boolean NOT NULL DEFAULT false,
  default_wallet_id uuid,
  active_book_id uuid,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  icon text,
  color text,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_members (
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role book_role NOT NULL DEFAULT 'viewer',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.book_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  email citext NOT NULL,
  role book_role NOT NULL DEFAULT 'viewer',
  token text NOT NULL UNIQUE,
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FKs that reference wallets/books created later (deferred via ALTER)
-- profiles.default_wallet_id / active_book_id added in 003 after wallets exist.
