-- Fix: add_role() always failed with `column reference "role" is ambiguous`
-- because its parameter shares the name of user_roles.role (used in the
-- ON CONFLICT target). The parameter name is part of the PostgREST API
-- (`rpc('add_role', { role })`), so resolve the conflict in the body instead.

create or replace function public.add_role(role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if add_role.role not in ('patient', 'guardian', 'donor') then
    raise exception using errcode = 'P0001', message = 'invalid_self_service_role';
  end if;

  -- Audited by the `audit_row_change` trigger on user_roles.
  insert into public.user_roles (user_id, role, granted_by)
  values (auth.uid(), add_role.role, auth.uid())
  on conflict (user_id, role) do nothing;
end;
$$;
