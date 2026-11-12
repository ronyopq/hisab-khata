-- Hisab Khata — RLS regression probes (Sprint 1)
-- Run against a project with `begin; ... rollback;` so nothing persists.
-- Each probe should raise an error (the fix is working) or return 0 rows.
--
-- Expected results are in comments. Run block by block: a raised exception
-- aborts the rest of the transaction, which is why each probe is separate.

-- 1) anon must not read the balance views at all.
--    Expect: ERROR 42501 permission denied for view wallet_balances
begin;
set local role anon;
select count(*) from public.wallet_balances;
rollback;

-- 2) a signed-in user must not be able to make themselves an admin.
--    Expect: ERROR 42501 is_admin can only be changed by the service role
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<USER_ID>","role":"authenticated"}';
update public.profiles set is_admin = true where id = '<USER_ID>';
rollback;

-- 3) a transaction may not reference another book's wallet.
--    Expect: ERROR 23503 violates foreign key constraint "tx_wallet_book_fk"
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<USER_ID>","role":"authenticated"}';
insert into public.transactions (book_id, type, amount, wallet_id, created_by)
values ('<MY_BOOK_ID>', 'expense', 100, '<OTHER_BOOK_WALLET_ID>', '<USER_ID>');
rollback;

-- 4) the last owner of a book cannot leave.
--    Expect: ERROR 23514 A book must keep at least one owner
begin;
delete from public.book_members where book_id = '<BOOK_ID>' and user_id = '<OWNER_ID>';
rollback;

-- 5) an editor cannot invite someone as owner.
--    Expect: ERROR 42501 new row violates row-level security policy
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<EDITOR_ID>","role":"authenticated"}';
insert into public.book_invites (book_id, email, role, token, invited_by)
values ('<BOOK_ID>', 'evil@example.com', 'owner', 'tok-evil', '<EDITOR_ID>');
rollback;

-- 6) an editor cannot rewrite an invite token (column-level grant allows status only).
--    Expect: ERROR 42501 permission denied for table book_invites
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<EDITOR_ID>","role":"authenticated"}';
update public.book_invites set token = 'hijacked' where book_id = '<BOOK_ID>';
rollback;

-- 7) service-role writes still succeed and are logged (cron path).
--    Expect: one transaction row, one activity_logs row with actor = 'system'
begin;
insert into public.transactions (book_id, type, amount, wallet_id, created_by)
values ('<BOOK_ID>', 'expense', 12345, '<WALLET_ID>', '<OWNER_ID>') returning id;
select action, user_id, meta->>'actor' from public.activity_logs order by id desc limit 1;
rollback;

-- 8) account deletion removes the profile and its solo books.
--    Expect: profile_left = 0, book_left = 0
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<USER_ID>","role":"authenticated"}';
select public.delete_my_account_data();
select (select count(*) from public.profiles where id = '<USER_ID>') as profile_left,
       (select count(*) from public.books where owner_id = '<USER_ID>') as book_left;
rollback;

-- 9) ownership transfer is atomic and leaves the book with an owner.
--    Expect: old_owner_role = editor, new_owner_role = owner
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<OWNER_ID>","role":"authenticated"}';
select public.transfer_book_ownership('<BOOK_ID>', '<NEW_OWNER_ID>');
select (select role from public.book_members where book_id='<BOOK_ID>' and user_id='<OWNER_ID>') as old_owner_role,
       (select role from public.book_members where book_id='<BOOK_ID>' and user_id='<NEW_OWNER_ID>') as new_owner_role;
rollback;

-- 10) de-duplicated notifications: the second identical insert is ignored,
--     while two NULL dedupe_key rows are both kept.
--     Expect: 3 rows total (t1, n1, n2) — no "t1dup"
begin;
insert into public.notifications (user_id, book_id, type, title, dedupe_key)
values ('<USER_ID>','<BOOK_ID>','system','t1','k1') on conflict (user_id, dedupe_key) do nothing;
insert into public.notifications (user_id, book_id, type, title, dedupe_key)
values ('<USER_ID>','<BOOK_ID>','system','t1dup','k1') on conflict (user_id, dedupe_key) do nothing;
insert into public.notifications (user_id, book_id, type, title, dedupe_key)
values ('<USER_ID>','<BOOK_ID>','system','n1',null) on conflict (user_id, dedupe_key) do nothing;
insert into public.notifications (user_id, book_id, type, title, dedupe_key)
values ('<USER_ID>','<BOOK_ID>','system','n2',null) on conflict (user_id, dedupe_key) do nothing;
select title, dedupe_key from public.notifications order by title;
rollback;
