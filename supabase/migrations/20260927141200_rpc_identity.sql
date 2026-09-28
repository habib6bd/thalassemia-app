-- Phase 1a RPCs: onboarding, self-service roles, donor profile (§8, D2).

create function public.complete_onboarding(
  roles public.app_role[],
  display_name text,
  phone text default null,
  district_id int default null,
  area text default null,
  language text default 'bn',
  share_contact_on_accept boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  foreach v_role in array roles loop
    if v_role not in ('patient', 'guardian', 'donor') then
      raise exception using errcode = 'P0001', message = 'invalid_self_service_role';
    end if;
  end loop;

  update public.profiles
  set display_name = complete_onboarding.display_name,
      phone = complete_onboarding.phone,
      district_id = complete_onboarding.district_id,
      area = complete_onboarding.area,
      language = complete_onboarding.language,
      share_contact_on_accept = complete_onboarding.share_contact_on_accept,
      onboarded_at = coalesce(profiles.onboarded_at, now())
  where user_id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  select auth.uid(), r, auth.uid()
  from unnest(roles) as r
  on conflict (user_id, role) do nothing;

  perform public.write_audit('onboarding_completed', 'profiles', v_profile.user_id, null, to_jsonb(v_profile));

  return v_profile;
end;
$$;

create function public.add_role(role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if role not in ('patient', 'guardian', 'donor') then
    raise exception using errcode = 'P0001', message = 'invalid_self_service_role';
  end if;

  -- Audited by the `audit_row_change` trigger on user_roles.
  insert into public.user_roles (user_id, role, granted_by)
  values (auth.uid(), role, auth.uid())
  on conflict (user_id, role) do nothing;
end;
$$;

create function public.upsert_donor_profile(
  blood_group public.blood_group,
  availability public.donor_availability default 'available',
  available_from date default null,
  emergency_available boolean default false,
  searchable boolean default false
)
returns public.donor_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_donor public.donor_profiles;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if not public.has_role('donor') then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  insert into public.donor_profiles (
    user_id, blood_group, availability, available_from, emergency_available, searchable
  )
  values (
    auth.uid(), blood_group, availability, available_from, emergency_available, searchable
  )
  on conflict (user_id) do update
    set blood_group = excluded.blood_group,
        availability = excluded.availability,
        available_from = excluded.available_from,
        emergency_available = excluded.emergency_available,
        searchable = excluded.searchable
  returning * into v_donor;

  -- Audited by the `audit_row_change` trigger on donor_profiles.

  return v_donor;
end;
$$;
