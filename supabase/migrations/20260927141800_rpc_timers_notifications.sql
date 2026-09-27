-- Phase 1a: scheduled expiry (§11) and client-facing notification/push RPCs.

-- Internal only (not granted to clients); run by pg_cron.
create function public.process_request_timers()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grace_hours int;
  v_request record;
  v_response record;
begin
  select coalesce((value #>> '{}')::int, 24) into v_grace_hours
  from public.app_settings where key = 'request_expiry_grace_hours';

  for v_request in
    select * from public.blood_requests
    where status in ('open', 'responding', 'partially_fulfilled')
      and required_at + make_interval(hours => v_grace_hours) < now()
    for update
  loop
    update public.blood_requests
    set status = 'expired', closed_at = now()
    where id = v_request.id;

    for v_response in
      select * from public.donor_responses
      where request_id = v_request.id and status in ('invited', 'accepted', 'donation_pending')
    loop
      update public.donor_responses
      set status = 'expired', status_changed_at = now()
      where id = v_response.id;

      perform public.enqueue_notification(
        v_response.donor_id, 'request_cancelled', 'blood_request', v_request.id, '{}'::jsonb
      );
    end loop;
  end loop;
end;
$$;

select cron.schedule(
  'process-request-timers',
  '*/10 * * * *',
  $$select public.process_request_timers()$$
);

create function public.mark_notification_read(id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification public.notifications;
begin
  update public.notifications
  set read_at = now()
  where notifications.id = mark_notification_read.id
    and user_id = auth.uid()
    and read_at is null
  returning * into v_notification;

  if not found then
    select * into v_notification from public.notifications
    where notifications.id = mark_notification_read.id and user_id = auth.uid();

    if not found then
      raise exception using errcode = 'P0001', message = 'notification_not_found';
    end if;
  end if;

  return v_notification;
end;
$$;

create function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

create function public.register_push_token(token text, platform text)
returns public.push_tokens
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.push_tokens;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  insert into public.push_tokens (user_id, token, platform, updated_at)
  values (auth.uid(), token, platform, now())
  on conflict (user_id, token) do update
    set platform = excluded.platform, updated_at = now()
  returning * into v_token;

  return v_token;
end;
$$;
