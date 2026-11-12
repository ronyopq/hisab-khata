-- Hisab Khata — 010 Security Hardening (Sprint 1)
-- Fixes report §§1.1, 1.3, 1.4, 1.5, 1.6, 1.10, 2.1 (part), 4.15, 4.17
-- Idempotent. Backwards compatible with the currently deployed app.
--
-- Two policies are dropped and recreated with stricter rules (book_invites_insert,
-- debt_payments_update); everything else is create-or-replace / add-if-absent.

-- ---------------------------------------------------------------------------
-- 1) Views: stop the anon data leak (§1.1)
--    Views owned by `postgres` ignore the caller's RLS unless security_invoker.
-- ---------------------------------------------------------------------------
alter view public.wallet_balances set (security_invoker = on);
alter view public.debt_balances    set (security_invoker = on);
alter view public.budget_usage     set (security_invoker = on);

-- Views are read-only projections: anon must not see them at all, and
-- authenticated must not be able to write through them.
revoke all on public.wallet_balances, public.debt_balances, public.budget_usage from anon;
revoke insert, update, delete, truncate
  on public.wallet_balances, public.debt_balances, public.budget_usage
  from authenticated;
grant select on public.wallet_balances, public.debt_balances, public.budget_usage
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2) profiles.is_admin cannot be self-granted (§1.3)
--    SECURITY INVOKER on purpose: current_user must be the *caller* so the
--    service role can still promote users, while `authenticated` cannot.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_user not in ('postgres', 'service_role', 'supabase_admin')
  then
    raise exception 'is_admin can only be changed by the service role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileges on public.profiles;
create trigger trg_guard_profile_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- 3) A book always keeps at least one owner (§1.6)
--    Whole-book cascades are allowed: by the time the FK action runs, the
--    books row is already gone, so the existence check short-circuits.
-- ---------------------------------------------------------------------------
create or replace function public.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.books b where b.id = old.book_id) then
    return coalesce(new, old);
  end if;

  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner')
  then
    if not exists (
      select 1 from public.book_members m
      where m.book_id = old.book_id
        and m.user_id <> old.user_id
        and m.role = 'owner'
    ) then
      raise exception 'A book must keep at least one owner; transfer ownership first'
        using errcode = '23514';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_guard_last_owner on public.book_members;
create trigger trg_guard_last_owner
  before delete or update of role on public.book_members
  for each row execute function public.guard_last_owner();

-- ---------------------------------------------------------------------------
-- 4) Ownership transfer as one atomic, definer-rights operation (§1.6)
--    The old client flow demoted the current owner first, so a mid-way failure
--    left the book with zero owners.
-- ---------------------------------------------------------------------------
create or replace function public.transfer_book_ownership(p_book_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not public.is_book_owner(p_book_id) then
    raise exception 'Only the current owner can transfer ownership' using errcode = '42501';
  end if;

  if p_new_owner = v_uid then
    raise exception 'You are already the owner';
  end if;

  if not exists (
    select 1 from public.book_members
    where book_id = p_book_id and user_id = p_new_owner
  ) then
    raise exception 'The new owner must already be a member of this book';
  end if;

  -- Promote before demoting so the last-owner guard never trips.
  update public.book_members set role = 'owner'
   where book_id = p_book_id and user_id = p_new_owner;

  update public.book_members set role = 'editor'
   where book_id = p_book_id and user_id = v_uid;

  update public.books set owner_id = p_new_owner
   where id = p_book_id;

  if not found then
    raise exception 'Book not found';
  end if;
end;
$$;

revoke all on function public.transfer_book_ownership(uuid, uuid) from public;
revoke all on function public.transfer_book_ownership(uuid, uuid) from anon;
grant execute on function public.transfer_book_ownership(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Invites: an editor must not escalate anyone (including themselves) (§1.5)
-- ---------------------------------------------------------------------------
drop policy if exists book_invites_insert on public.book_invites;
create policy book_invites_insert on public.book_invites
  for insert
  with check (
    public.is_book_member(book_id, 'editor')
    and invited_by = auth.uid()
    and (role <> 'owner' or public.is_book_owner(book_id))
  );

-- Invite rows are append-only apart from their status: column-level grants stop
-- an editor rewriting email/role/token of a pending invite (token hijack).
revoke update on public.book_invites from authenticated;
revoke update on public.book_invites from anon;
grant update (status) on public.book_invites to authenticated;

-- The accept path enforces the same rule, and fixes the anon 23502 abort.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.book_invites%rowtype;
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null then
    raise exception 'Not authenticated; sign in before accepting an invite'
      using errcode = '42501';
  end if;

  select * into v_invite
    from public.book_invites
   where token = p_token and status = 'pending' and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if v_email = '' or v_email <> lower(v_invite.email::text) then
    raise exception 'Invite email mismatch';
  end if;

  -- Only a real owner can hand out the owner role (blocks the editor→owner path).
  if v_invite.role = 'owner' and not exists (
    select 1 from public.book_members m
    where m.book_id = v_invite.book_id
      and m.user_id = v_invite.invited_by
      and m.role = 'owner'
  ) then
    raise exception 'Only a book owner can grant the owner role'
      using errcode = '42501';
  end if;

  insert into public.book_members (book_id, user_id, role)
  values (v_invite.book_id, v_uid, v_invite.role)
  on conflict (book_id, user_id) do update
    set role = case
      -- never demote an existing owner by accepting a lesser invite
      when public.book_members.role = 'owner' then 'owner'::book_role
      else excluded.role
    end;

  update public.book_invites set status = 'accepted' where id = v_invite.id;
  return v_invite.book_id;
end;
$$;

revoke all on function public.accept_invite(text) from public;
revoke all on function public.accept_invite(text) from anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Debt payments: UPDATE must also validate the new row (§4.15)
-- ---------------------------------------------------------------------------
drop policy if exists debt_payments_update on public.debt_payments;
create policy debt_payments_update on public.debt_payments
  for update
  using (
    exists (
      select 1 from public.debts d
      where d.id = debt_id and public.is_book_member(d.book_id, 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.debts d
      where d.id = debt_id and public.is_book_member(d.book_id, 'editor')
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Cross-book references: a row may only point at objects of its own book (§1.4)
--    Live audit found 0 violating rows, so VALIDATE is safe.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wallets_id_book_key') then
    alter table public.wallets add constraint wallets_id_book_key unique (id, book_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'categories_id_book_key') then
    alter table public.categories add constraint categories_id_book_key unique (id, book_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contacts_id_book_key') then
    alter table public.contacts add constraint contacts_id_book_key unique (id, book_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tx_wallet_book_fk') then
    alter table public.transactions add constraint tx_wallet_book_fk
      foreign key (wallet_id, book_id) references public.wallets (id, book_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tx_to_wallet_book_fk') then
    alter table public.transactions add constraint tx_to_wallet_book_fk
      foreign key (to_wallet_id, book_id) references public.wallets (id, book_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tx_category_book_fk') then
    alter table public.transactions add constraint tx_category_book_fk
      foreign key (category_id, book_id) references public.categories (id, book_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_category_book_fk') then
    alter table public.budgets add constraint budgets_category_book_fk
      foreign key (category_id, book_id) references public.categories (id, book_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_wallet_book_fk') then
    alter table public.recurring_rules add constraint recurring_wallet_book_fk
      foreign key (wallet_id, book_id) references public.wallets (id, book_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_category_book_fk') then
    alter table public.recurring_rules add constraint recurring_category_book_fk
      foreign key (category_id, book_id) references public.categories (id, book_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'debts_contact_book_fk') then
    alter table public.debts add constraint debts_contact_book_fk
      foreign key (contact_id, book_id) references public.contacts (id, book_id) not valid;
  end if;

  begin
    alter table public.transactions     validate constraint tx_wallet_book_fk;
    alter table public.transactions     validate constraint tx_to_wallet_book_fk;
    alter table public.transactions     validate constraint tx_category_book_fk;
    alter table public.budgets          validate constraint budgets_category_book_fk;
    alter table public.recurring_rules  validate constraint recurring_wallet_book_fk;
    alter table public.recurring_rules  validate constraint recurring_category_book_fk;
    alter table public.debts            validate constraint debts_contact_book_fk;
  exception when others then
    raise notice 'constraint validation skipped: %', sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 8) Activity log: never fail a write because auth.uid() is null (§2.1)
--    Cron/service-role writes had no uid, so the NOT NULL column aborted every
--    recurring transaction. Falls back to the row author, then the book owner.
--    NEW/OLD are unassigned records on the "other" trigger operation, so every
--    reference is branched on TG_OP.
-- ---------------------------------------------------------------------------
alter table public.activity_logs alter column user_id drop not null;

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_book uuid;
  v_row_id uuid;
  v_user uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    v_book := old.book_id;
    v_row_id := old.id;
    if tg_table_name = 'transactions' then
      v_user := coalesce(v_user, old.created_by);
    end if;
  else
    v_book := new.book_id;
    v_row_id := new.id;
    if tg_table_name = 'transactions' then
      v_user := coalesce(v_user, new.created_by);
    end if;
  end if;

  if v_user is null then
    select m.user_id into v_user
      from public.book_members m
     where m.book_id = v_book and m.role = 'owner'
     order by m.joined_at
     limit 1;
  end if;

  insert into public.activity_logs (book_id, user_id, action, entity, entity_id, meta)
  values (
    v_book,
    v_user,
    tg_op || ' ' || tg_table_name,
    tg_table_name,
    v_row_id,
    jsonb_build_object(
      'op', tg_op,
      'actor', case when auth.uid() is null then 'system' else 'user' end
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) Notification de-duplication (cron re-sent the same alert every day)
-- ---------------------------------------------------------------------------
alter table public.notifications add column if not exists dedupe_key text;
-- Full unique index, not partial: PostgREST's ON CONFLICT needs a usable arbiter,
-- and NULL dedupe_key values stay distinct so plain notifications are unaffected.
create unique index if not exists notifications_dedupe_uniq
  on public.notifications (user_id, dedupe_key);

-- ---------------------------------------------------------------------------
-- 10) Account deletion that actually works (§1.10)
--     books.owner_id / transactions.created_by / book_invites.invited_by are
--     ON DELETE RESTRICT, so the old code always failed and still reported
--     success. This re-parents everything that has to survive.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_book record;
  v_heir uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- 1. Books: delete solo ones, hand shared ones to the earliest other member.
  for v_book in select id from public.books where owner_id = v_uid loop
    select m.user_id into v_heir
      from public.book_members m
     where m.book_id = v_book.id
       and m.user_id <> v_uid
     order by m.joined_at
     limit 1;

    if v_heir is null then
      delete from public.books where id = v_book.id;
    else
      update public.book_members set role = 'owner'
       where book_id = v_book.id and user_id = v_heir;
      update public.books set owner_id = v_heir where id = v_book.id;
      delete from public.book_members
       where book_id = v_book.id and user_id = v_uid;
    end if;
    v_heir := null;
  end loop;

  -- 2. Anything still pointing at this user through a RESTRICT foreign key.
  update public.transactions t
     set created_by = b.owner_id
    from public.books b
   where t.book_id = b.id
     and t.created_by = v_uid
     and b.owner_id <> v_uid;

  update public.activity_logs set user_id = null where user_id = v_uid;
  delete from public.book_invites where invited_by = v_uid;

  -- 3. Memberships in books owned by other people (cascades already handled the rest).
  delete from public.book_members where user_id = v_uid;
  delete from public.profiles where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account_data() from public;
revoke all on function public.delete_my_account_data() from anon;
grant execute on function public.delete_my_account_data() to authenticated;

-- ---------------------------------------------------------------------------
-- 10b) budget_usage aggregated with SUM over a LEFT JOIN, so a book with no
--      transactions reported spent = 0 instead of NULL, and the Dhaka month
--      boundary was computed in UTC (§2.4). Both are fixed here.
-- ---------------------------------------------------------------------------
create or replace view public.budget_usage as
select
  b.id as budget_id,
  b.book_id,
  b.category_id,
  b.month,
  b.amount as budget_amount,
  coalesce(sum(t.amount), 0) as spent
from public.budgets b
left join public.transactions t
  on t.book_id = b.book_id
 and t.deleted_at is null
 and t.type = 'expense'
 -- Dhaka is UTC+6: shift before truncating so a 00:30 Dhaka expense lands in today's month.
 and date_trunc('month', (t.occurred_at at time zone 'Asia/Dhaka'))::date = b.month
 and (b.category_id is null or t.category_id = b.category_id)
group by b.id;

alter view public.budget_usage set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- 11) Realtime: book collaboration events need the tables in the publication
--     (§3.8). Guarded because ADD TABLE errors when the table is listed.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'book_members', 'activity_logs']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
