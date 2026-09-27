-- Phase 1c: contact reveal (ARCHITECTURE.md §9) — a gap 1a/1b left open.
-- "When a donor accepts, managers and that donor may see each other's
-- phone + preferred_contact only if that user set share_contact_on_accept
-- = true." profiles RLS only ever allowed a user to see their own phone,
-- so there was no path to this at all. This RPC is that path: minimal
-- fields, gated on response status and each side's own consent flag,
-- available to either party of the response.
create function public.get_response_contact(response_id uuid)
returns table (
  donor_phone text,
  donor_preferred_contact public.contact_method,
  manager_phone text,
  manager_preferred_contact public.contact_method
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response public.donor_responses;
  v_request public.blood_requests;
begin
  select * into v_response from public.donor_responses where id = response_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  select * into v_request from public.blood_requests where id = v_response.request_id;

  if v_response.donor_id <> auth.uid() and not public.is_patient_manager(v_request.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_response.status not in ('accepted', 'donation_pending', 'completed') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  return query
  select
    case when dp.share_contact_on_accept then dp.phone end,
    case when dp.share_contact_on_accept then dp.preferred_contact end,
    case when mp.share_contact_on_accept then mp.phone end,
    case when mp.share_contact_on_accept then mp.preferred_contact end
  from public.donor_responses dr
  join public.profiles dp on dp.user_id = dr.donor_id
  join public.blood_requests br on br.id = dr.request_id
  left join public.patient_managers pm on pm.patient_id = br.patient_id and pm.is_primary
  left join public.profiles mp on mp.user_id = pm.user_id
  where dr.id = response_id;
end;
$$;

grant execute on function public.get_response_contact to authenticated;
