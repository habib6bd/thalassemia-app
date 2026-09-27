-- Phase 1b fix: neither party to a `requested` connection could see who the
-- other side even is. `is_connected_donor`/`manages_connected_donor`/
-- `shares_active_connection` are deliberately scoped to active/paused
-- (a pending request shouldn't unlock the *full* patient card or donor
-- profile) — but the manager approving a request needs at least the
-- donor's name/blood group/availability, and the requesting donor needs to
-- see which patient they asked to join. This RPC returns exactly that
-- minimal pair, to either party of the connection, at any status.
create function public.get_connection_parties(connection_id uuid)
returns table (
  donor_display_name text,
  donor_blood_group public.blood_group,
  donor_availability public.donor_availability,
  patient_display_name text,
  patient_blood_group public.blood_group,
  patient_district_id int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.patient_donor_connections;
begin
  select * into v_connection from public.patient_donor_connections where id = connection_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'connection_not_found';
  end if;

  if v_connection.donor_id <> auth.uid() and not public.is_patient_manager(v_connection.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    dp_profile.display_name, dp.blood_group, dp.availability,
    p.display_name, p.blood_group, p.district_id
  from public.patient_donor_connections c
  join public.donor_profiles dp on dp.user_id = c.donor_id
  join public.profiles dp_profile on dp_profile.user_id = c.donor_id
  join public.patients p on p.id = c.patient_id
  where c.id = connection_id;
end;
$$;

grant execute on function public.get_connection_parties to authenticated;
