-- Phase 1a: audit triggers (ARCHITECTURE.md D8) on every sensitive table.
-- One generic trigger function, attached to each table the phase-1 spec
-- lists, captures actor/action/before/after automatically — so every write
-- (all of them RPC-only, D3) is audited without each RPC doing it by hand.

create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_id uuid;
begin
  v_row_id := nullif(coalesce(to_jsonb(new), to_jsonb(old)) ->> 'id', '')::uuid;

  insert into public.audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
  values (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_row_id,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_row_change
  after insert or update or delete on public.patients
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.patient_managers
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.donor_profiles
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.patient_donor_connections
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.blood_requests
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.donor_responses
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.donations
  for each row execute function public.audit_row_change();

create trigger audit_row_change
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();
