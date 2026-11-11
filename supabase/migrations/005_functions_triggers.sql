-- Hisab Khata — 005 Functions & Triggers

-- Role hierarchy helper: owner(3) > editor(2) > viewer(1)
CREATE OR REPLACE FUNCTION public.is_book_member(p_book_id uuid, p_min_role book_role DEFAULT 'viewer')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_members bm
    WHERE bm.book_id = p_book_id
      AND bm.user_id = auth.uid()
      AND (
        CASE p_min_role
          WHEN 'owner' THEN bm.role = 'owner'
          WHEN 'editor' THEN bm.role IN ('owner','editor')
          ELSE bm.role IN ('owner','editor','viewer')
        END
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_book_owner(p_book_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_members
    WHERE book_id = p_book_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','books','wallets','categories','transactions','budgets','recurring_rules','contacts','debts','goals']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- Activity log trigger (transactions only for Phase 2; extend later)
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (book_id, user_id, action, entity, entity_id, meta)
  VALUES (
    COALESCE(NEW.book_id, OLD.book_id),
    auth.uid(),
    TG_OP || ' ' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('op', TG_OP)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_transactions ON public.transactions;
CREATE TRIGGER trg_log_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- handle_new_user: profile + default book + owner membership + Cash wallet + bilingual categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_book_id uuid;
  v_wallet_id uuid;
  v_name text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name, locale, currency)
  VALUES (NEW.id, v_name, 'bn', 'BDT')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.books (name, currency, owner_id)
  VALUES ('ব্যক্তিগত / Personal', 'BDT', NEW.id)
  RETURNING id INTO v_book_id;

  INSERT INTO public.book_members (book_id, user_id, role)
  VALUES (v_book_id, NEW.id, 'owner');

  INSERT INTO public.wallets (book_id, name, type, provider, opening_balance, sort_order)
  VALUES (v_book_id, 'Cash', 'cash', NULL, 0, 0)
  RETURNING id INTO v_wallet_id;

  UPDATE public.profiles SET default_wallet_id = v_wallet_id, active_book_id = v_book_id WHERE id = NEW.id;

  -- Default expense categories (14)
  INSERT INTO public.categories (book_id, type, name_bn, name_en, icon, color, sort_order) VALUES
    (v_book_id,'expense','খাবার','Food','UtensilsCrossed','#f59e0b',1),
    (v_book_id,'expense','বাজার','Groceries','ShoppingBasket','#84cc16',2),
    (v_book_id,'expense','যাতায়াত','Transport','Bus','#3b82f6',3),
    (v_book_id,'expense','বাসা ভাড়া','Rent','Home','#ef4444',4),
    (v_book_id,'expense','বিদ্যুৎ-গ্যাস-পানি','Utilities','Zap','#eab308',5),
    (v_book_id,'expense','মোবাইল ও ইন্টারনেট','Mobile & Internet','Smartphone','#8b5cf6',6),
    (v_book_id,'expense','শিক্ষা','Education','GraduationCap','#06b6d4',7),
    (v_book_id,'expense','চিকিৎসা','Health','HeartPulse','#f43f5e',8),
    (v_book_id,'expense','কেনাকাটা','Shopping','ShoppingBag','#ec4899',9),
    (v_book_id,'expense','বিনোদন','Entertainment','Clapperboard','#a855f7',10),
    (v_book_id,'expense','পরিবার','Family','Users','#14b8a6',11),
    (v_book_id,'expense','দান-সদকা','Charity','HandHeart','#22c55e',12),
    (v_book_id,'expense','ভ্রমণ','Travel','Plane','#0ea5e9',13),
    (v_book_id,'expense','অন্যান্য','Other','MoreHorizontal','#64748b',14),
    -- Default income categories (6)
    (v_book_id,'income','বেতন','Salary','Briefcase','#16a34a',1),
    (v_book_id,'income','ব্যবসা','Business','Store','#059669',2),
    (v_book_id,'income','ফ্রিল্যান্সিং','Freelancing','Laptop','#0d9488',3),
    (v_book_id,'income','উপহার','Gift','Gift','#65a30d',4),
    (v_book_id,'income','বিনিয়োগ মুনাফা','Investment','TrendingUp','#0891b2',5),
    (v_book_id,'income','অন্যান্য','Other','MoreHorizontal','#64748b',6);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dashboard RPC: totals + previous period + by-category + daily series
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_book_id uuid, p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_duration interval := p_to - p_from;
  v_prev_from timestamptz := p_from - v_duration;
  v_prev_to timestamptz := p_from;
  v_result jsonb;
BEGIN
  IF NOT public.is_book_member(p_book_id, 'viewer') THEN
    RAISE EXCEPTION 'Not a book member';
  END IF;

  SELECT jsonb_build_object(
    'current', (
      SELECT jsonb_build_object(
        'income', COALESCE(SUM(amount) FILTER (WHERE type='income'),0),
        'expense', COALESCE(SUM(amount) FILTER (WHERE type='expense'),0),
        'net', COALESCE(SUM(amount) FILTER (WHERE type='income'),0) - COALESCE(SUM(amount) FILTER (WHERE type='expense'),0)
      ) FROM public.transactions
      WHERE book_id = p_book_id AND deleted_at IS NULL AND occurred_at >= p_from AND occurred_at < p_to
    ),
    'previous', (
      SELECT jsonb_build_object(
        'income', COALESCE(SUM(amount) FILTER (WHERE type='income'),0),
        'expense', COALESCE(SUM(amount) FILTER (WHERE type='expense'),0),
        'net', COALESCE(SUM(amount) FILTER (WHERE type='income'),0) - COALESCE(SUM(amount) FILTER (WHERE type='expense'),0)
      ) FROM public.transactions
      WHERE book_id = p_book_id AND deleted_at IS NULL AND occurred_at >= v_prev_from AND occurred_at < v_prev_to
    ),
    'by_category', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT c.id, c.name_bn, c.name_en, c.icon, c.color,
               COALESCE(SUM(tx.amount),0) AS total
        FROM public.categories c
        LEFT JOIN public.transactions tx
          ON tx.category_id = c.id AND tx.deleted_at IS NULL
          AND tx.occurred_at >= p_from AND tx.occurred_at < p_to
        WHERE c.book_id = p_book_id AND c.type = 'expense' AND c.is_archived = false
        GROUP BY c.id ORDER BY total DESC
      ) t
    ),
    'daily', (
      SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb) FROM (
        SELECT date_trunc('day', occurred_at)::date AS day,
               COALESCE(SUM(amount) FILTER (WHERE type='income'),0) AS income,
               COALESCE(SUM(amount) FILTER (WHERE type='expense'),0) AS expense
        FROM public.transactions
        WHERE book_id = p_book_id AND deleted_at IS NULL AND occurred_at >= p_from AND occurred_at < p_to
        GROUP BY 1
      ) d
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_trend(p_book_id uuid, p_months integer DEFAULT 6)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_book_member(p_book_id, 'viewer') THEN
    RAISE EXCEPTION 'Not a book member';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(m) ORDER BY m.month), '[]'::jsonb) FROM (
      SELECT date_trunc('month', occurred_at)::date AS month,
             COALESCE(SUM(amount) FILTER (WHERE type='income'),0) AS income,
             COALESCE(SUM(amount) FILTER (WHERE type='expense'),0) AS expense
      FROM public.transactions
      WHERE book_id = p_book_id AND deleted_at IS NULL
        AND occurred_at >= date_trunc('month', now()) - (p_months - 1) * interval '1 month'
      GROUP BY 1
    ) m
  );
END;
$$;

-- Invite accept (SECURITY DEFINER so token lookup bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invite record;
BEGIN
  SELECT * INTO v_invite FROM public.book_invites WHERE token = p_token AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invite'; END IF;
  IF lower(auth.jwt() ->> 'email') <> lower(v_invite.email::text) THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;
  INSERT INTO public.book_members (book_id, user_id, role)
  VALUES (v_invite.book_id, auth.uid(), v_invite.role)
  ON CONFLICT (book_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.book_invites SET status = 'accepted' WHERE id = v_invite.id;
  RETURN v_invite.book_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_book_member(uuid, book_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_book_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_book_member(uuid, book_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_book_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_trend(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
