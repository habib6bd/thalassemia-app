-- Phase 1a RPCs: patients (§5.2, §8, D2).

create function public.create_patient(
  display_name text,
  blood_group public.blood_group,
  district_id int,
  as_self boolean default false,
  area text default null,
  treating_centre text default null,
  next_transfusion_date date default null,
  thalassemia_type text default null,
  show_treating_centre boolean default true,
  show_area boolean default true,
  show_next_transfusion boolean default true,
  show_thalassemia_type boolean default false
)
returns public.patients
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient public.patients;
  v_relation public.manager_relation;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if as_self then
    if not public.has_role('patient') then
      raise exception using errcode = 'P0001', message = 'not_authorized';
    end if;
    v_relation := 'self';
  else
    if not public.has_role('guardian') then
      raise exception using errcode = 'P0001', message = 'not_authorized';
    end if;
    v_relation := 'guardian';
  end if;

  insert into public.patients (
    display_name, blood_group, district_id, area, treating_centre,
    next_transfusion_date, thalassemia_type, invite_code, created_by,
    show_treating_centre, show_area, show_next_transfusion, show_thalassemia_type
  )
  values (
    create_patient.display_name, create_patient.blood_group, create_patient.district_id,
    create_patient.area, create_patient.treating_centre, create_patient.next_transfusion_date,
    create_patient.thalassemia_type, public.generate_invite_code(), auth.uid(),
    create_patient.show_treating_centre, create_patient.show_area,
    create_patient.show_next_transfusion, create_patient.show_thalassemia_type
  )
  returning * into v_patient;

  -- Both inserts are audited by `audit_row_change` triggers.
  insert into public.patient_managers (patient_id, user_id, relation, is_primary)
  values (v_patient.id, auth.uid(), v_relation, true);

  return v_patient;
end;
$$;

create function public.update_patient(
  patient_id uuid,
  display_name text default null,
  blood_group public.blood_group default null,
  district_id int default null,
  area text default null,
  treating_centre text default null,
  next_transfusion_date date default null,
  thalassemia_type text default null,
  show_treating_centre boolean default null,
  show_area boolean default null,
  show_next_transfusion boolean default null,
  show_thalassemia_type boolean default null
)
returns public.patients
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.patients;
  v_after public.patients;
begin
  if not public.is_patient_manager(patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_before from public.patients where id = patient_id for update;
  if not found or v_before.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'patient_not_found';
  end if;

  update public.patients set
    display_name = coalesce(update_patient.display_name, patients.display_name),
    blood_group = coalesce(update_patient.blood_group, patients.blood_group),
    district_id = coalesce(update_patient.district_id, patients.district_id),
    area = coalesce(update_patient.area, patients.area),
    treating_centre = coalesce(update_patient.treating_centre, patients.treating_centre),
    next_transfusion_date = coalesce(update_patient.next_transfusion_date, patients.next_transfusion_date),
    thalassemia_type = coalesce(update_patient.thalassemia_type, patients.thalassemia_type),
    show_treating_centre = coalesce(update_patient.show_treating_centre, patients.show_treating_centre),
    show_area = coalesce(update_patient.show_area, patients.show_area),
    show_next_transfusion = coalesce(update_patient.show_next_transfusion, patients.show_next_transfusion),
    show_thalassemia_type = coalesce(update_patient.show_thalassemia_type, patients.show_thalassemia_type)
  where id = patient_id
  returning * into v_after;

  -- Audited by the `audit_row_change` trigger on patients.

  return v_after;
end;
$$;

create function public.rotate_invite_code(patient_id uuid)
returns public.patients
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.patients;
  v_after public.patients;
begin
  if not public.is_patient_manager(patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_before from public.patients where id = patient_id for update;
  if not found or v_before.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'patient_not_found';
  end if;

  update public.patients
  set invite_code = public.generate_invite_code()
  where id = patient_id
  returning * into v_after;

  -- Audited by the `audit_row_change` trigger on patients.

  return v_after;
end;
$$;
