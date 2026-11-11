-- Hisab Khata — 007 RLS Policies
-- Every table ENABLE ROW LEVEL SECURITY. Never trust client.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- profiles: own row only (admin via service role)
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles FOR DELETE USING (id = auth.uid());

-- books: member SELECT; any authenticated INSERT; owner UPDATE/DELETE
DROP POLICY IF EXISTS books_select ON public.books;
CREATE POLICY books_select ON public.books FOR SELECT USING (public.is_book_member(id, 'viewer'));
DROP POLICY IF EXISTS books_insert ON public.books;
CREATE POLICY books_insert ON public.books FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS books_update ON public.books;
CREATE POLICY books_update ON public.books FOR UPDATE USING (public.is_book_owner(id)) WITH CHECK (public.is_book_owner(id));
DROP POLICY IF EXISTS books_delete ON public.books;
CREATE POLICY books_delete ON public.books FOR DELETE USING (public.is_book_owner(id));

-- book_members: member SELECT; owner INSERT/UPDATE/DELETE; self DELETE (leave)
DROP POLICY IF EXISTS book_members_select ON public.book_members;
CREATE POLICY book_members_select ON public.book_members FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS book_members_insert ON public.book_members;
CREATE POLICY book_members_insert ON public.book_members FOR INSERT WITH CHECK (public.is_book_owner(book_id));
DROP POLICY IF EXISTS book_members_update ON public.book_members;
CREATE POLICY book_members_update ON public.book_members FOR UPDATE USING (public.is_book_owner(book_id)) WITH CHECK (public.is_book_owner(book_id));
DROP POLICY IF EXISTS book_members_delete ON public.book_members;
CREATE POLICY book_members_delete ON public.book_members FOR DELETE USING (public.is_book_owner(book_id) OR user_id = auth.uid());

-- book_invites: owner/editor SELECT/INSERT/UPDATE; owner DELETE
DROP POLICY IF EXISTS book_invites_select ON public.book_invites;
CREATE POLICY book_invites_select ON public.book_invites FOR SELECT USING (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS book_invites_insert ON public.book_invites;
CREATE POLICY book_invites_insert ON public.book_invites FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor') AND invited_by = auth.uid());
DROP POLICY IF EXISTS book_invites_update ON public.book_invites;
CREATE POLICY book_invites_update ON public.book_invites FOR UPDATE USING (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS book_invites_delete ON public.book_invites;
CREATE POLICY book_invites_delete ON public.book_invites FOR DELETE USING (public.is_book_owner(book_id));

-- Generic book-scoped tables: member SELECT; editor+ INSERT/UPDATE/DELETE
-- wallets
DROP POLICY IF EXISTS wallets_select ON public.wallets;
CREATE POLICY wallets_select ON public.wallets FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS wallets_insert ON public.wallets;
CREATE POLICY wallets_insert ON public.wallets FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS wallets_update ON public.wallets;
CREATE POLICY wallets_update ON public.wallets FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS wallets_delete ON public.wallets;
CREATE POLICY wallets_delete ON public.wallets FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- categories
DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- transactions (soft delete via UPDATE deleted_at; hard DELETE also editor+ for cleanup)
DROP POLICY IF EXISTS transactions_select ON public.transactions;
CREATE POLICY transactions_select ON public.transactions FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY transactions_insert ON public.transactions FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor') AND created_by = auth.uid());
DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_update ON public.transactions FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS transactions_delete ON public.transactions;
CREATE POLICY transactions_delete ON public.transactions FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- budgets
DROP POLICY IF EXISTS budgets_select ON public.budgets;
CREATE POLICY budgets_select ON public.budgets FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS budgets_insert ON public.budgets;
CREATE POLICY budgets_insert ON public.budgets FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS budgets_update ON public.budgets;
CREATE POLICY budgets_update ON public.budgets FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS budgets_delete ON public.budgets;
CREATE POLICY budgets_delete ON public.budgets FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- recurring_rules
DROP POLICY IF EXISTS recurring_select ON public.recurring_rules;
CREATE POLICY recurring_select ON public.recurring_rules FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS recurring_insert ON public.recurring_rules;
CREATE POLICY recurring_insert ON public.recurring_rules FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS recurring_update ON public.recurring_rules;
CREATE POLICY recurring_update ON public.recurring_rules FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS recurring_delete ON public.recurring_rules;
CREATE POLICY recurring_delete ON public.recurring_rules FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- contacts
DROP POLICY IF EXISTS contacts_select ON public.contacts;
CREATE POLICY contacts_select ON public.contacts FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS contacts_insert ON public.contacts;
CREATE POLICY contacts_insert ON public.contacts FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS contacts_update ON public.contacts;
CREATE POLICY contacts_update ON public.contacts FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS contacts_delete ON public.contacts;
CREATE POLICY contacts_delete ON public.contacts FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- debts
DROP POLICY IF EXISTS debts_select ON public.debts;
CREATE POLICY debts_select ON public.debts FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS debts_insert ON public.debts;
CREATE POLICY debts_insert ON public.debts FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS debts_update ON public.debts;
CREATE POLICY debts_update ON public.debts FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS debts_delete ON public.debts;
CREATE POLICY debts_delete ON public.debts FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- debt_payments (via parent debt's book)
DROP POLICY IF EXISTS debt_payments_select ON public.debt_payments;
CREATE POLICY debt_payments_select ON public.debt_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND public.is_book_member(d.book_id, 'viewer'))
);
DROP POLICY IF EXISTS debt_payments_insert ON public.debt_payments;
CREATE POLICY debt_payments_insert ON public.debt_payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND public.is_book_member(d.book_id, 'editor'))
);
DROP POLICY IF EXISTS debt_payments_update ON public.debt_payments;
CREATE POLICY debt_payments_update ON public.debt_payments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND public.is_book_member(d.book_id, 'editor'))
);
DROP POLICY IF EXISTS debt_payments_delete ON public.debt_payments;
CREATE POLICY debt_payments_delete ON public.debt_payments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND public.is_book_member(d.book_id, 'editor'))
);

-- goals
DROP POLICY IF EXISTS goals_select ON public.goals;
CREATE POLICY goals_select ON public.goals FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS goals_insert ON public.goals;
CREATE POLICY goals_insert ON public.goals FOR INSERT WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS goals_update ON public.goals;
CREATE POLICY goals_update ON public.goals FOR UPDATE USING (public.is_book_member(book_id, 'editor')) WITH CHECK (public.is_book_member(book_id, 'editor'));
DROP POLICY IF EXISTS goals_delete ON public.goals;
CREATE POLICY goals_delete ON public.goals FOR DELETE USING (public.is_book_member(book_id, 'editor'));

-- goal_contributions (via parent goal's book)
DROP POLICY IF EXISTS goal_contributions_select ON public.goal_contributions;
CREATE POLICY goal_contributions_select ON public.goal_contributions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND public.is_book_member(g.book_id, 'viewer'))
);
DROP POLICY IF EXISTS goal_contributions_insert ON public.goal_contributions;
CREATE POLICY goal_contributions_insert ON public.goal_contributions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND public.is_book_member(g.book_id, 'editor'))
);
DROP POLICY IF EXISTS goal_contributions_update ON public.goal_contributions;
CREATE POLICY goal_contributions_update ON public.goal_contributions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND public.is_book_member(g.book_id, 'editor'))
);
DROP POLICY IF EXISTS goal_contributions_delete ON public.goal_contributions;
CREATE POLICY goal_contributions_delete ON public.goal_contributions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND public.is_book_member(g.book_id, 'editor'))
);

-- notifications: own only
DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- activity_logs: member SELECT; no direct INSERT/UPDATE/DELETE (trigger + service role only)
DROP POLICY IF EXISTS activity_logs_select ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT USING (public.is_book_member(book_id, 'viewer'));
DROP POLICY IF EXISTS activity_logs_insert ON public.activity_logs;
CREATE POLICY activity_logs_insert ON public.activity_logs FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS activity_logs_update ON public.activity_logs;
CREATE POLICY activity_logs_update ON public.activity_logs FOR UPDATE USING (false);
DROP POLICY IF EXISTS activity_logs_delete ON public.activity_logs;
CREATE POLICY activity_logs_delete ON public.activity_logs FOR DELETE USING (false);
