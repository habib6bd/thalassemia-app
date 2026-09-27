-- Phase 1a: shared helpers every RPC uses for audit + notifications (D8, §10).

create function public.write_audit(
  p_action text,
  p_table_name text,
  p_row_id uuid,
  p_old_data jsonb,
  p_new_data jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
  values (auth.uid(), p_action, p_table_name, p_row_id, p_old_data, p_new_data);
$$;

create function public.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_params jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, entity_type, entity_id, params)
  values (p_user_id, p_type, p_entity_type, p_entity_id, p_params);
$$;

-- 8-char code, unambiguous alphabet (no 0/O/1/I/L), retried on collision.
create function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception using errcode = 'P0001', message = 'invite_code_generation_failed';
    end if;

    candidate := (
      select string_agg(substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1), '')
      from generate_series(1, 8)
    );

    exit when not exists (select 1 from public.patients where invite_code = candidate);
  end loop;

  return candidate;
end;
$$;
