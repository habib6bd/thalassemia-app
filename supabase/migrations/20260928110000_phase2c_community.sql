-- Phase 2c: community posts/comments, reports, user blocks, moderation
-- (phase-2.md 2c, ARCHITECTURE §6/§7.4/§8, OPEN_QUESTIONS Q24–Q27).
--
-- Every post is personal experience, never medical advice (§28.10); the app
-- shows that label on every post. Writes go through RPCs only (D3). Reports
-- auto-hide content after `community_auto_hide_report_threshold` distinct
-- reporters; admins restore, hide or remove it. Blocking hides content both
-- ways and stops new connection requests between the two users.

-- No money-related topic (§28.11, Q24).
create type public.community_topic as enum (
  'treatment_centre_experience',
  'transfusion_experience',
  'managing_transfusions',
  'family_experience',
  'emotional_support',
  'support_resources',
  'newly_diagnosed',
  'questions'
);

-- published → hidden (auto or moderator) → published (restore) / removed.
-- deleted = removed by its author (or account deletion). removed/deleted are terminal.
create type public.community_content_status as enum ('published', 'hidden', 'removed', 'deleted');

create type public.report_reason as enum (
  'selling_blood',
  'medical_misinformation',
  'harassment',
  'privacy',
  'spam',
  'other'
);

create type public.report_status as enum ('open', 'actioned', 'dismissed');

insert into public.app_settings (key, value, description) values
  ('community_auto_hide_report_threshold', '3', 'Distinct reports after which a community post/comment is hidden until an admin reviews it.'),
  ('community_daily_post_limit', '10', 'Maximum community posts one user can publish in 24 hours (spam guard).'),
  ('community_guidelines_version', '1', 'Current community guidelines version; users accept it again when it changes.')
on conflict (key) do nothing;

-- === tables ===================================================================
create table public.community_guideline_acceptances (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  version int not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (user_id),
  topic public.community_topic not null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  status public.community_content_status not null default 'published',
  report_count int not null default 0,
  moderated_by uuid references public.profiles (user_id),
  moderated_at timestamptz,
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_feed_idx on public.community_posts (status, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id),
  author_id uuid not null references public.profiles (user_id),
  body text not null check (char_length(body) between 1 and 2000),
  status public.community_content_status not null default 'published',
  report_count int not null default 0,
  moderated_by uuid references public.profiles (user_id),
  moderated_at timestamptz,
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_comments_post_idx on public.community_comments (post_id, created_at);
create index community_comments_author_idx on public.community_comments (author_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (user_id),
  post_id uuid references public.community_posts (id),
  comment_id uuid references public.community_comments (id),
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 500),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (user_id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);

create unique index reports_one_per_post on public.reports (reporter_id, post_id) where post_id is not null;
create unique index reports_one_per_comment on public.reports (reporter_id, comment_id) where comment_id is not null;
create index reports_open_idx on public.reports (status, created_at);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (user_id) on delete cascade,
  blocked_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

create trigger set_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.community_comments
  for each row execute function public.set_updated_at();

create trigger audit_row_change after insert or update or delete on public.community_posts
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.community_comments
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.reports
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.user_blocks
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.community_guideline_acceptances
  for each row execute function public.audit_row_change();

-- === helpers ==================================================================
-- True when either user has blocked the other. Used by RLS and RPCs.
create function public.is_blocked_between(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other_user_id)
       or (b.blocker_id = other_user_id and b.blocked_id = auth.uid())
  );
$$;

create function public.community_setting_int(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::int from public.app_settings where key = p_key), p_default);
$$;

create function public.has_accepted_community_guidelines()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_guideline_acceptances a
    where a.user_id = auth.uid()
      and a.version = public.community_setting_int('community_guidelines_version', 1)
  );
$$;

-- Caller must be signed in, not deleted, and have accepted the current guidelines.
create function public.assert_can_post_in_community()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;
  if exists (select 1 from public.profiles where user_id = auth.uid() and deleted_at is not null) then
    raise exception using errcode = 'P0001', message = 'account_deleted';
  end if;
  if not public.has_accepted_community_guidelines() then
    raise exception using errcode = 'P0001', message = 'guidelines_not_accepted';
  end if;
end;
$$;

-- === RLS ======================================================================
alter table public.community_guideline_acceptances enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;

revoke all on public.community_guideline_acceptances, public.community_posts,
  public.community_comments, public.reports, public.user_blocks
  from public, anon, authenticated;
grant select on public.community_guideline_acceptances, public.community_posts,
  public.community_comments, public.reports, public.user_blocks
  to authenticated;

create policy guideline_acceptances_select_own on public.community_guideline_acceptances
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy community_posts_select on public.community_posts
  for select to authenticated
  using (
    (status = 'published' and not public.is_blocked_between(author_id))
    or (author_id = auth.uid() and status in ('published', 'hidden'))
    or public.is_admin()
  );

create policy community_comments_select on public.community_comments
  for select to authenticated
  using (
    public.is_admin()
    or (
      exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')
      and (
        (status = 'published' and not public.is_blocked_between(author_id))
        or (author_id = auth.uid() and status in ('published', 'hidden'))
      )
    )
  );

create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- A blocked user never learns they were blocked.
create policy user_blocks_select_own on public.user_blocks
  for select to authenticated
  using (blocker_id = auth.uid());

-- === guidelines ===============================================================
create function public.accept_community_guidelines()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;
  if exists (select 1 from public.profiles where user_id = auth.uid() and deleted_at is not null) then
    raise exception using errcode = 'P0001', message = 'account_deleted';
  end if;

  insert into public.community_guideline_acceptances (user_id, version)
  values (auth.uid(), public.community_setting_int('community_guidelines_version', 1))
  on conflict (user_id, version) do nothing;
end;
$$;

-- === read RPCs ================================================================
-- Feed: published posts not involving a block, plus the caller's own hidden
-- posts (so authors see "hidden while reviewed"). Keyset pagination on created_at.
create function public.list_community_posts(
  topic_filter public.community_topic default null,
  before_created_at timestamptz default null,
  page_size int default 20
)
returns table (
  id uuid,
  topic public.community_topic,
  title text,
  body text,
  status public.community_content_status,
  author_id uuid,
  author_name text,
  is_mine boolean,
  comment_count int,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    p.id, p.topic, p.title, p.body, p.status, p.author_id, pr.display_name,
    p.author_id = auth.uid(),
    (
      select count(*)::int from public.community_comments c
      where c.post_id = p.id and c.status = 'published' and not public.is_blocked_between(c.author_id)
    ),
    p.created_at
  from public.community_posts p
  join public.profiles pr on pr.user_id = p.author_id
  where (
      (p.status = 'published' and not public.is_blocked_between(p.author_id))
      or (p.author_id = auth.uid() and p.status = 'hidden')
    )
    and (topic_filter is null or p.topic = topic_filter)
    and (before_created_at is null or p.created_at < before_created_at)
  order by p.created_at desc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
end;
$$;

create function public.get_community_post(post_id uuid)
returns table (
  id uuid,
  topic public.community_topic,
  title text,
  body text,
  status public.community_content_status,
  author_id uuid,
  author_name text,
  is_mine boolean,
  created_at timestamptz,
  reported_by_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    p.id, p.topic, p.title, p.body, p.status, p.author_id, pr.display_name,
    p.author_id = auth.uid(), p.created_at,
    exists (select 1 from public.reports r where r.post_id = p.id and r.reporter_id = auth.uid())
  from public.community_posts p
  join public.profiles pr on pr.user_id = p.author_id
  where p.id = get_community_post.post_id
    and (
      (p.status = 'published' and not public.is_blocked_between(p.author_id))
      or (p.author_id = auth.uid() and p.status = 'hidden')
      or public.is_admin()
    );

  if not found then
    raise exception using errcode = 'P0001', message = 'post_not_found';
  end if;
end;
$$;

create function public.list_community_comments(post_id uuid)
returns table (
  id uuid,
  body text,
  status public.community_content_status,
  author_id uuid,
  author_name text,
  is_mine boolean,
  created_at timestamptz,
  reported_by_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if not exists (
    select 1 from public.community_posts p
    where p.id = list_community_comments.post_id
      and (
        (p.status = 'published' and not public.is_blocked_between(p.author_id))
        or (p.author_id = auth.uid() and p.status = 'hidden')
        or public.is_admin()
      )
  ) then
    raise exception using errcode = 'P0001', message = 'post_not_found';
  end if;

  return query
  select
    c.id, c.body, c.status, c.author_id, pr.display_name,
    c.author_id = auth.uid(), c.created_at,
    exists (select 1 from public.reports r where r.comment_id = c.id and r.reporter_id = auth.uid())
  from public.community_comments c
  join public.profiles pr on pr.user_id = c.author_id
  where c.post_id = list_community_comments.post_id
    and (
      (c.status = 'published' and not public.is_blocked_between(c.author_id))
      or (c.author_id = auth.uid() and c.status = 'hidden')
    )
  order by c.created_at;
end;
$$;

-- === write RPCs ===============================================================
create function public.create_community_post(topic public.community_topic, title text, body text)
returns public.community_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(create_community_post.title);
  v_body text := trim(create_community_post.body);
  v_row public.community_posts;
begin
  perform public.assert_can_post_in_community();

  if v_title is null or char_length(v_title) not between 1 and 120
     or v_body is null or char_length(v_body) not between 1 and 5000 then
    raise exception using errcode = 'P0001', message = 'invalid_post';
  end if;

  if (
    select count(*) from public.community_posts p
    where p.author_id = auth.uid() and p.created_at > now() - interval '24 hours'
  ) >= public.community_setting_int('community_daily_post_limit', 10) then
    raise exception using errcode = 'P0001', message = 'post_limit_reached';
  end if;

  insert into public.community_posts (author_id, topic, title, body)
  values (auth.uid(), create_community_post.topic, v_title, v_body)
  returning * into v_row;

  return v_row;
end;
$$;

create function public.delete_community_post(post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.community_posts p
  set status = 'deleted'
  where p.id = delete_community_post.post_id
    and p.author_id = auth.uid()
    and p.status in ('published', 'hidden');

  if not found then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;
end;
$$;

create function public.create_community_comment(post_id uuid, body text)
returns public.community_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text := trim(create_community_comment.body);
  v_post public.community_posts;
  v_row public.community_comments;
begin
  perform public.assert_can_post_in_community();

  select * into v_post from public.community_posts p where p.id = create_community_comment.post_id;
  if not found or v_post.status <> 'published' or public.is_blocked_between(v_post.author_id) then
    raise exception using errcode = 'P0001', message = 'post_not_found';
  end if;

  if v_body is null or char_length(v_body) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_comment';
  end if;

  insert into public.community_comments (post_id, author_id, body)
  values (v_post.id, auth.uid(), v_body)
  returning * into v_row;

  if v_post.author_id <> auth.uid() then
    perform public.enqueue_notification(
      v_post.author_id, 'community_comment_added', 'community_post', v_post.id, '{}'::jsonb
    );
  end if;

  return v_row;
end;
$$;

create function public.delete_community_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.community_comments c
  set status = 'deleted'
  where c.id = delete_community_comment.comment_id
    and c.author_id = auth.uid()
    and c.status in ('published', 'hidden');

  if not found then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;
end;
$$;

-- === reports ==================================================================
-- target_type: 'post' | 'comment'. The target must be visible to the reporter.
-- Each reporter counts once; at the threshold a published item is hidden
-- until an admin reviews it (auto-hide, §28.8). Admins are notified on
-- auto-hide and on every "selling blood" report (§28.11).
create function public.report_community_content(
  target_type text,
  target_id uuid,
  reason public.report_reason,
  details text default null
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_details text := nullif(trim(report_community_content.details), '');
  v_author uuid;
  v_status public.community_content_status;
  v_post_id uuid;
  v_count int;
  v_threshold int := public.community_setting_int('community_auto_hide_report_threshold', 3);
  v_report public.reports;
  v_auto_hidden boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_details is not null and char_length(v_details) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_report';
  end if;

  if target_type = 'post' then
    select p.author_id, p.status, p.id into v_author, v_status, v_post_id
    from public.community_posts p where p.id = target_id for update;
  elsif target_type = 'comment' then
    select c.author_id, c.status, c.post_id into v_author, v_status, v_post_id
    from public.community_comments c where c.id = target_id for update;
  else
    raise exception using errcode = 'P0001', message = 'invalid_target';
  end if;

  if v_author is null or v_status <> 'published' or public.is_blocked_between(v_author) then
    raise exception using errcode = 'P0001', message = 'content_not_found';
  end if;

  if v_author = auth.uid() then
    raise exception using errcode = 'P0001', message = 'cannot_report_own';
  end if;

  begin
    insert into public.reports (reporter_id, post_id, comment_id, reason, details)
    values (
      auth.uid(),
      case when target_type = 'post' then target_id end,
      case when target_type = 'comment' then target_id end,
      reason,
      v_details
    )
    returning * into v_report;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'already_reported';
  end;

  if target_type = 'post' then
    update public.community_posts p set report_count = p.report_count + 1
    where p.id = target_id returning p.report_count into v_count;
    if v_count >= v_threshold then
      update public.community_posts p set status = 'hidden' where p.id = target_id;
      v_auto_hidden := true;
    end if;
  else
    update public.community_comments c set report_count = c.report_count + 1
    where c.id = target_id returning c.report_count into v_count;
    if v_count >= v_threshold then
      update public.community_comments c set status = 'hidden' where c.id = target_id;
      v_auto_hidden := true;
    end if;
  end if;

  if v_auto_hidden or reason = 'selling_blood' then
    perform public.enqueue_notification(
      ur.user_id,
      case when v_auto_hidden then 'community_content_auto_hidden' else 'community_report_urgent' end,
      'community_post',
      v_post_id,
      jsonb_build_object('target_type', target_type)
    )
    from public.user_roles ur
    where ur.role = 'admin';
  end if;

  return v_report;
end;
$$;

-- === blocks ===================================================================
create function public.block_user(user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;
  if block_user.user_id = auth.uid() then
    raise exception using errcode = 'P0001', message = 'invalid_target';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = block_user.user_id) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (auth.uid(), block_user.user_id)
  on conflict do nothing;
end;
$$;

create function public.unblock_user(user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  delete from public.user_blocks b
  where b.blocker_id = auth.uid() and b.blocked_id = unblock_user.user_id;
end;
$$;

create function public.list_blocked_users()
returns table (user_id uuid, display_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select b.blocked_id, p.display_name, b.created_at
  from public.user_blocks b
  join public.profiles p on p.user_id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
end;
$$;

-- Blocking also blocks connection requests in both directions. The error
-- reuses each path's "not found" code so a user can't tell they're blocked.
create function public.block_connections_between_blocked_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.patient_managers pm
    join public.user_blocks b
      on (b.blocker_id = pm.user_id and b.blocked_id = new.donor_id)
      or (b.blocker_id = new.donor_id and b.blocked_id = pm.user_id)
    where pm.patient_id = new.patient_id
  ) then
    raise exception using errcode = 'P0001',
      message = case when new.initiated_by = 'donor' then 'invalid_invite_code' else 'donor_not_available' end;
  end if;
  return new;
end;
$$;

create trigger block_connections_between_blocked_users
  before insert on public.patient_donor_connections
  for each row execute function public.block_connections_between_blocked_users();

-- === moderation (admin) =======================================================
-- Content with open reports, most-reported first; "selling blood" is flagged.
create function public.list_moderation_queue()
returns table (
  target_type text,
  target_id uuid,
  post_id uuid,
  title text,
  body text,
  status public.community_content_status,
  author_id uuid,
  author_name text,
  open_reports int,
  reasons public.report_reason[],
  has_selling_blood boolean,
  details text[],
  last_reported_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  with open_reports as (
    select
      case when r.post_id is not null then 'post' else 'comment' end as t_type,
      coalesce(r.post_id, r.comment_id) as t_id,
      count(*)::int as n,
      array_agg(distinct r.reason) as reasons,
      bool_or(r.reason = 'selling_blood') as selling,
      array_remove(array_agg(r.details order by r.created_at), null) as details,
      max(r.created_at) as last_at
    from public.reports r
    where r.status = 'open'
    group by 1, 2
  )
  select
    o.t_type,
    o.t_id,
    coalesce(p.id, c.post_id),
    p.title,
    coalesce(p.body, c.body),
    coalesce(p.status, c.status),
    coalesce(p.author_id, c.author_id),
    pr.display_name,
    o.n,
    o.reasons,
    o.selling,
    o.details,
    o.last_at
  from open_reports o
  left join public.community_posts p on o.t_type = 'post' and p.id = o.t_id
  left join public.community_comments c on o.t_type = 'comment' and c.id = o.t_id
  join public.profiles pr on pr.user_id = coalesce(p.author_id, c.author_id)
  order by o.selling desc, o.n desc, o.last_at desc;
end;
$$;

-- action: 'restore' (publish again, dismiss open reports),
--         'hide' (hidden, reports actioned), 'remove' (terminal, reports actioned).
create function public.moderate_community_content(
  target_type text,
  target_id uuid,
  action text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(trim(moderate_community_content.note), '');
  v_status public.community_content_status;
  v_author uuid;
  v_post_id uuid;
  v_new public.community_content_status;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if action not in ('restore', 'hide', 'remove') then
    raise exception using errcode = 'P0001', message = 'invalid_action';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_report';
  end if;

  if target_type = 'post' then
    select p.status, p.author_id, p.id into v_status, v_author, v_post_id
    from public.community_posts p where p.id = target_id for update;
  elsif target_type = 'comment' then
    select c.status, c.author_id, c.post_id into v_status, v_author, v_post_id
    from public.community_comments c where c.id = target_id for update;
  else
    raise exception using errcode = 'P0001', message = 'invalid_target';
  end if;

  if v_status is null then
    raise exception using errcode = 'P0001', message = 'content_not_found';
  end if;

  if v_status in ('removed', 'deleted') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  v_new := case action
    when 'restore' then 'published'
    when 'hide' then 'hidden'
    else 'removed'
  end::public.community_content_status;

  if target_type = 'post' then
    update public.community_posts
    set status = v_new, moderated_by = auth.uid(), moderated_at = now(), moderation_note = v_note,
        report_count = case when action = 'restore' then 0 else report_count end
    where id = target_id;
    update public.reports
    set status = case when action = 'restore' then 'dismissed' else 'actioned' end::public.report_status,
        resolved_by = auth.uid(), resolved_at = now()
    where post_id = target_id and status = 'open';
  else
    update public.community_comments
    set status = v_new, moderated_by = auth.uid(), moderated_at = now(), moderation_note = v_note,
        report_count = case when action = 'restore' then 0 else report_count end
    where id = target_id;
    update public.reports
    set status = case when action = 'restore' then 'dismissed' else 'actioned' end::public.report_status,
        resolved_by = auth.uid(), resolved_at = now()
    where comment_id = target_id and status = 'open';
  end if;

  perform public.write_audit(
    'community_moderated',
    case when target_type = 'post' then 'community_posts' else 'community_comments' end,
    target_id,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', v_new, 'action', action, 'note', v_note)
  );

  if action <> 'restore' or v_status = 'hidden' then
    perform public.enqueue_notification(
      v_author, 'community_content_moderated', 'community_post', v_post_id,
      jsonb_build_object('target_type', target_type, 'action', action)
    );
  end if;
end;
$$;

-- === account deletion ========================================================
-- When a profile is soft-deleted (delete_my_account), its community content
-- is taken down (it may hold personal experiences) and its blocks and
-- guideline acceptances are removed. Reports it filed stay for moderation.
create function public.community_cleanup_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.community_posts set status = 'deleted'
  where author_id = new.user_id and status in ('published', 'hidden');
  update public.community_comments set status = 'deleted'
  where author_id = new.user_id and status in ('published', 'hidden');
  delete from public.user_blocks where blocker_id = new.user_id or blocked_id = new.user_id;
  delete from public.community_guideline_acceptances where user_id = new.user_id;
  return new;
end;
$$;

create trigger community_cleanup_on_profile_delete
  after update of deleted_at on public.profiles
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.community_cleanup_on_profile_delete();

-- Data export now includes the caller's community content, reports and blocks.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = v_uid),
    'roles', coalesce((select jsonb_agg(r.role) from public.user_roles r where r.user_id = v_uid), '[]'::jsonb),
    'donor_profile', (select to_jsonb(d) from public.donor_profiles d where d.user_id = v_uid),
    'managed_patients', coalesce((
      select jsonb_agg(to_jsonb(pt) - 'invite_code' || jsonb_build_object('relation', pm.relation, 'is_primary', pm.is_primary))
      from public.patient_managers pm
      join public.patients pt on pt.id = pm.patient_id
      where pm.user_id = v_uid
    ), '[]'::jsonb),
    'blood_requests_created', coalesce((
      select jsonb_agg(to_jsonb(br)) from public.blood_requests br where br.created_by = v_uid
    ), '[]'::jsonb),
    'donor_connections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'patient_id', c.patient_id, 'tier', c.tier, 'status', c.status,
        'created_at', c.created_at, 'status_changed_at', c.status_changed_at))
      from public.patient_donor_connections c where c.donor_id = v_uid
    ), '[]'::jsonb),
    'donor_responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'request_id', r.request_id, 'status', r.status, 'scheduled_at', r.scheduled_at,
        'donor_reported_donated_at', r.donor_reported_donated_at, 'created_at', r.created_at))
      from public.donor_responses r where r.donor_id = v_uid
    ), '[]'::jsonb),
    'donations_given', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'donated_on', d.donated_on, 'verification', d.verification))
      from public.donations d where d.donor_id = v_uid
    ), '[]'::jsonb),
    'appreciation_received', coalesce((
      select jsonb_agg(jsonb_build_object('message', a.message, 'created_at', a.created_at))
      from public.appreciation_messages a where a.recipient_id = v_uid and a.removed_at is null
    ), '[]'::jsonb),
    'appreciation_sent', coalesce((
      select jsonb_agg(jsonb_build_object('message', a.message, 'created_at', a.created_at))
      from public.appreciation_messages a where a.sender_id = v_uid
    ), '[]'::jsonb),
    'notification_preferences', coalesce((
      select jsonb_agg(to_jsonb(n) - 'user_id') from public.notification_preferences n where n.user_id = v_uid
    ), '[]'::jsonb),
    'community_posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'topic', p.topic, 'title', p.title, 'body', p.body, 'status', p.status,
        'created_at', p.created_at))
      from public.community_posts p where p.author_id = v_uid
    ), '[]'::jsonb),
    'community_comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'post_id', c.post_id, 'body', c.body, 'status', c.status, 'created_at', c.created_at))
      from public.community_comments c where c.author_id = v_uid
    ), '[]'::jsonb),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at))
      from public.reports r where r.reporter_id = v_uid
    ), '[]'::jsonb),
    'blocked_users', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', b.blocked_id, 'created_at', b.created_at))
      from public.user_blocks b where b.blocker_id = v_uid
    ), '[]'::jsonb),
    'community_guidelines_accepted', coalesce((
      select jsonb_agg(jsonb_build_object('version', a.version, 'accepted_at', a.accepted_at))
      from public.community_guideline_acceptances a where a.user_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

-- RLS helper + client RPCs.
grant execute on function public.is_blocked_between to authenticated;
grant execute on function public.has_accepted_community_guidelines to authenticated;
grant execute on function public.accept_community_guidelines to authenticated;
grant execute on function public.list_community_posts to authenticated;
grant execute on function public.get_community_post to authenticated;
grant execute on function public.list_community_comments to authenticated;
grant execute on function public.create_community_post to authenticated;
grant execute on function public.delete_community_post to authenticated;
grant execute on function public.create_community_comment to authenticated;
grant execute on function public.delete_community_comment to authenticated;
grant execute on function public.report_community_content to authenticated;
grant execute on function public.block_user to authenticated;
grant execute on function public.unblock_user to authenticated;
grant execute on function public.list_blocked_users to authenticated;
grant execute on function public.list_moderation_queue to authenticated;
grant execute on function public.moderate_community_content to authenticated;
