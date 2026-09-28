-- Security invariants for the whole `public` schema (Phase 4d review,
-- docs/SECURITY_PRIVACY.md). These hold for every current and future table,
-- view and function, so a new migration can't silently weaken them.
begin;
select plan(8);

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity$$,
  'every table in public has row level security enabled'
);

select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg = 'search_path=""')$$,
  'every security definer function pins search_path to empty'
);

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
      and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
        or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))$$,
  'anon can read or write no table or view'
);

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and (has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update')
        or has_table_privilege('authenticated', c.oid, 'delete')
        or exists (select 1 from information_schema.column_privileges cp
                   where cp.table_schema = 'public' and cp.table_name = c.relname
                     and cp.grantee = 'authenticated' and cp.privilege_type in ('INSERT', 'UPDATE')))$$,
  'views are read-only for signed-in users (no write-through past RLS)'
);

-- Tables clients may write directly (own rows, enforced by RLS). Everything
-- else changes only through RPCs (D3).
select set_eq(
  $$select distinct c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and (has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update')
        or has_table_privilege('authenticated', c.oid, 'delete')
        or exists (select 1 from information_schema.column_privileges cp
                   where cp.table_schema = 'public' and cp.table_name = c.relname
                     and cp.grantee = 'authenticated' and cp.privilege_type in ('INSERT', 'UPDATE')))$$,
  array['profiles', 'donor_profiles', 'push_tokens', 'notification_preferences'],
  'only own-row settings tables are directly writable'
);

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in (
      'audit_logs', 'blood_requests', 'donor_responses', 'donations', 'patient_donor_connections', 'user_roles')
      and (has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update')
        or has_table_privilege('authenticated', c.oid, 'delete'))$$,
  'stateful tables (D3) are not writable by clients'
);

-- Regression for SR-1: writing through the views is refused.
set local role authenticated;
select throws_ok($$update public.public_profiles set display_name = 'x'$$, '42501', null,
  'public_profiles cannot be updated by clients');
select throws_ok($$update public.patient_cards_for_donor set display_name = 'x'$$, '42501', null,
  'patient_cards_for_donor cannot be updated by clients');
reset role;

select * from finish();
rollback;
