-- Phase 3: awareness & carrier-education CMS (phase-3-4.md Phase 3,
-- ARCHITECTURE §6/§7.6/§8, OPEN_QUESTIONS Q32–Q36, docs/CONTENT_SAFETY.md).
--
-- Hard rule (CLAUDE.md #9): nothing medical is published by code or seed.
-- Content is published only through admin_transition_content(...'published')
-- and only when it has at least one source that a human has checked
-- (content_sources.accessed_at set), a human reviewer (reviewed_by/at) and
-- came through in_review → approved. A trigger re-checks this on every write.
--
-- Articles, FAQs and medicine information share one table and one review
-- workflow (`kind`, Q33). Medicine entries are informational only: generic
-- name, general purpose, safety notes, source. Never dosage (§19).

create type public.content_kind as enum ('article', 'faq', 'medicine');

create type public.awareness_category as enum (
  'what_is_thalassemia',
  'what_is_carrier',
  'why_screening',
  'both_carriers',
  'genetic_counselling',
  'screening',
  'family_awareness',
  'living_with_thalassemia',
  'medicines'
);

-- draft → in_review → approved → published → retired (§7.6)
create type public.content_review_status as enum ('draft', 'in_review', 'approved', 'published', 'retired');

insert into public.app_settings (key, value, description) values
  ('content_review_months', '12', 'Months after publishing (or last review) when a published awareness item is due for re-review.')
on conflict (key) do nothing;

-- === tables ===================================================================
create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  organization text check (organization is null or char_length(organization) <= 200),
  url text not null check (url ~* '^https?://[^\s]+$' and char_length(url) <= 500),
  -- Date a human opened and checked the source. Null = not yet checked;
  -- content citing an unchecked source can't be published.
  accessed_at date,
  created_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awareness_content (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null default 'article',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category public.awareness_category not null,
  title_bn text not null check (char_length(title_bn) between 1 and 200),
  title_en text not null check (char_length(title_en) between 1 and 200),
  summary_bn text check (summary_bn is null or char_length(summary_bn) <= 500),
  summary_en text check (summary_en is null or char_length(summary_en) <= 500),
  body_bn text not null check (char_length(body_bn) between 1 and 20000),
  body_en text not null check (char_length(body_en) between 1 and 20000),
  sort_order int not null default 0 check (sort_order between 0 and 10000),
  review_status public.content_review_status not null default 'draft',
  -- Set on approval; cleared whenever the text changes.
  reviewed_by uuid references public.profiles (user_id),
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  published_at timestamptz,
  next_review_due date,
  review_reminded_at timestamptz,
  -- 'agent' for machine-written drafts (CLAUDE.md #9), 'human' otherwise.
  drafted_by text not null default 'human' check (drafted_by in ('agent', 'human')),
  last_edited_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    review_status not in ('approved', 'published')
    or (reviewed_by is not null and reviewed_at is not null)
  ),
  check (review_status <> 'published' or (published_at is not null and next_review_due is not null))
);

create index awareness_content_listing_idx on public.awareness_content (review_status, kind, category, sort_order);

create table public.content_source_links (
  content_id uuid not null references public.awareness_content (id) on delete cascade,
  source_id uuid not null references public.content_sources (id),
  primary key (content_id, source_id)
);

create index content_source_links_source_idx on public.content_source_links (source_id);

create trigger set_updated_at before update on public.content_sources
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.awareness_content
  for each row execute function public.set_updated_at();

create trigger audit_row_change after insert or update or delete on public.content_sources
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.awareness_content
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.content_source_links
  for each row execute function public.audit_row_change();

-- Defence in depth: a published row always has a human review and at least
-- one human-checked source, whoever writes it.
create function public.enforce_content_publish_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.review_status = 'published' then
    if new.reviewed_by is null or new.reviewed_at is null then
      raise exception using errcode = 'P0001', message = 'review_required';
    end if;
    if not exists (
      select 1 from public.content_source_links l
      join public.content_sources s on s.id = l.source_id
      where l.content_id = new.id
    ) then
      raise exception using errcode = 'P0001', message = 'source_required';
    end if;
    if exists (
      select 1 from public.content_source_links l
      join public.content_sources s on s.id = l.source_id
      where l.content_id = new.id and s.accessed_at is null
    ) then
      raise exception using errcode = 'P0001', message = 'source_not_checked';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_content_publish_rules
  before insert or update on public.awareness_content
  for each row execute function public.enforce_content_publish_rules();

-- === RLS ======================================================================
alter table public.content_sources enable row level security;
alter table public.awareness_content enable row level security;
alter table public.content_source_links enable row level security;

revoke all on public.content_sources, public.awareness_content, public.content_source_links
  from public, anon, authenticated;
grant select on public.content_sources, public.content_source_links to authenticated;
-- Users read the reader-facing columns only; review internals go through
-- admin_list_content().
grant select (
  id, kind, slug, category, title_bn, title_en, summary_bn, summary_en, body_bn, body_en,
  sort_order, review_status, reviewed_at, published_at, updated_at
) on public.awareness_content to authenticated;

create policy awareness_content_select_published on public.awareness_content
  for select to authenticated
  using (review_status = 'published' or public.is_admin());

create policy content_source_links_select on public.content_source_links
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.awareness_content c where c.id = content_id and c.review_status = 'published')
  );

create policy content_sources_select on public.content_sources
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.content_source_links l
      join public.awareness_content c on c.id = l.content_id
      where l.source_id = content_sources.id and c.review_status = 'published'
    )
  );

-- === admin: sources ===========================================================
create function public.admin_upsert_content_source(
  source_id uuid,
  title text,
  url text,
  organization text default null,
  accessed_at date default null
)
returns public.content_sources
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.content_sources;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if admin_upsert_content_source.accessed_at > current_date then
    raise exception using errcode = 'P0001', message = 'invalid_source';
  end if;

  begin
    if admin_upsert_content_source.source_id is null then
      insert into public.content_sources (title, organization, url, accessed_at, created_by)
      values (
        trim(admin_upsert_content_source.title), nullif(trim(admin_upsert_content_source.organization), ''),
        trim(admin_upsert_content_source.url), admin_upsert_content_source.accessed_at, auth.uid()
      )
      returning * into v_row;
    else
      -- A source cited by published content can't be "unchecked" again.
      if admin_upsert_content_source.accessed_at is null and exists (
        select 1 from public.content_source_links l
        join public.awareness_content c on c.id = l.content_id
        where l.source_id = admin_upsert_content_source.source_id and c.review_status = 'published'
      ) then
        raise exception using errcode = 'P0001', message = 'source_in_use';
      end if;

      update public.content_sources s set
        title = trim(admin_upsert_content_source.title),
        organization = nullif(trim(admin_upsert_content_source.organization), ''),
        url = trim(admin_upsert_content_source.url),
        accessed_at = admin_upsert_content_source.accessed_at
      where s.id = admin_upsert_content_source.source_id
      returning * into v_row;

      if not found then
        raise exception using errcode = 'P0001', message = 'not_found';
      end if;
    end if;
  exception when check_violation or not_null_violation then
    raise exception using errcode = 'P0001', message = 'invalid_source';
  end;

  return v_row;
end;
$$;

-- === admin: content ===========================================================
create function public.admin_list_content()
returns table (
  id uuid,
  kind public.content_kind,
  slug text,
  category public.awareness_category,
  title_bn text,
  title_en text,
  review_status public.content_review_status,
  drafted_by text,
  reviewed_at timestamptz,
  published_at timestamptz,
  next_review_due date,
  source_count int,
  updated_at timestamptz
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
  select c.id, c.kind, c.slug, c.category, c.title_bn, c.title_en, c.review_status, c.drafted_by,
    c.reviewed_at, c.published_at, c.next_review_due,
    (select count(*)::int from public.content_source_links l where l.content_id = c.id),
    c.updated_at
  from public.awareness_content c
  order by
    case c.review_status when 'in_review' then 0 when 'approved' then 1 when 'draft' then 2 when 'published' then 3 else 4 end,
    c.kind, c.category, c.sort_order, c.slug;
end;
$$;

create function public.admin_get_content(content_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.awareness_content;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_row from public.awareness_content c where c.id = admin_get_content.content_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  return to_jsonb(v_row) || jsonb_build_object(
    'reviewer_name', (select p.display_name from public.profiles p where p.user_id = v_row.reviewed_by),
    'source_ids', coalesce((
      select jsonb_agg(l.source_id) from public.content_source_links l where l.content_id = v_row.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Create (content_id null) or edit. Only draft / in_review / approved items can
-- be edited, and any edit sends the item back to draft and clears the review.
-- Published items are retired and reopened first (Q34).
create function public.admin_upsert_content(
  content_id uuid,
  kind public.content_kind,
  slug text,
  category public.awareness_category,
  title_bn text,
  title_en text,
  body_bn text,
  body_en text,
  summary_bn text default null,
  summary_en text default null,
  sort_order int default 0
)
returns public.awareness_content
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.awareness_content;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  begin
    if admin_upsert_content.content_id is null then
      insert into public.awareness_content (
        kind, slug, category, title_bn, title_en, summary_bn, summary_en, body_bn, body_en,
        sort_order, drafted_by, last_edited_by
      ) values (
        admin_upsert_content.kind, lower(trim(admin_upsert_content.slug)), admin_upsert_content.category,
        trim(admin_upsert_content.title_bn), trim(admin_upsert_content.title_en),
        nullif(trim(admin_upsert_content.summary_bn), ''), nullif(trim(admin_upsert_content.summary_en), ''),
        trim(admin_upsert_content.body_bn), trim(admin_upsert_content.body_en),
        coalesce(admin_upsert_content.sort_order, 0), 'human', auth.uid()
      )
      returning * into v_row;
    else
      select * into v_row from public.awareness_content c
      where c.id = admin_upsert_content.content_id
      for update;
      if not found then
        raise exception using errcode = 'P0001', message = 'not_found';
      end if;
      if v_row.review_status in ('published', 'retired') then
        raise exception using errcode = 'P0001', message = 'content_locked';
      end if;

      update public.awareness_content c set
        kind = admin_upsert_content.kind,
        slug = lower(trim(admin_upsert_content.slug)),
        category = admin_upsert_content.category,
        title_bn = trim(admin_upsert_content.title_bn),
        title_en = trim(admin_upsert_content.title_en),
        summary_bn = nullif(trim(admin_upsert_content.summary_bn), ''),
        summary_en = nullif(trim(admin_upsert_content.summary_en), ''),
        body_bn = trim(admin_upsert_content.body_bn),
        body_en = trim(admin_upsert_content.body_en),
        sort_order = coalesce(admin_upsert_content.sort_order, 0),
        review_status = 'draft',
        reviewed_by = null,
        reviewed_at = null,
        last_edited_by = auth.uid()
      where c.id = v_row.id
      returning * into v_row;
    end if;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'slug_taken';
    when check_violation or not_null_violation then
      raise exception using errcode = 'P0001', message = 'invalid_content';
  end;

  return v_row;
end;
$$;

-- Replaces the item's sources. Not allowed once published (sources are part
-- of what was reviewed); editing sources also sends it back to draft.
create function public.admin_set_content_sources(content_id uuid, source_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.awareness_content;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_row from public.awareness_content c
  where c.id = admin_set_content_sources.content_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_row.review_status in ('published', 'retired') then
    raise exception using errcode = 'P0001', message = 'content_locked';
  end if;

  if exists (
    select 1 from unnest(coalesce(admin_set_content_sources.source_ids, '{}')) s(id)
    where not exists (select 1 from public.content_sources cs where cs.id = s.id)
  ) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  delete from public.content_source_links l where l.content_id = v_row.id;
  insert into public.content_source_links (content_id, source_id)
  select distinct v_row.id, s.id from unnest(coalesce(admin_set_content_sources.source_ids, '{}')) s(id);

  update public.awareness_content c
  set review_status = 'draft', reviewed_by = null, reviewed_at = null, last_edited_by = auth.uid()
  where c.id = v_row.id and c.review_status <> 'draft';
end;
$$;

-- Workflow (§7.6):
--   draft → in_review            submit
--   in_review → approved         human review (sets reviewed_by/at)
--   in_review | approved → draft changes requested
--   approved → published         needs ≥ 1 checked source (trigger)
--   published → retired          take offline
--   retired → draft              reopen for editing
--   published → published        "re-reviewed": keeps it live, restarts next_review_due
create function public.admin_transition_content(
  content_id uuid,
  to_status public.content_review_status,
  note text default null
)
returns public.awareness_content
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.awareness_content;
  v_from public.content_review_status;
  v_note text := nullif(trim(admin_transition_content.note), '');
  v_months int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'content_review_months'), 12);
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_note is not null and char_length(v_note) > 1000 then
    raise exception using errcode = 'P0001', message = 'invalid_content';
  end if;

  select * into v_row from public.awareness_content c
  where c.id = admin_transition_content.content_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  v_from := v_row.review_status;

  if not (
    (v_from = 'draft' and to_status = 'in_review')
    or (v_from = 'in_review' and to_status in ('approved', 'draft'))
    or (v_from = 'approved' and to_status in ('published', 'draft'))
    or (v_from = 'published' and to_status in ('retired', 'published'))
    or (v_from = 'retired' and to_status = 'draft')
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if to_status = 'approved' then
    update public.awareness_content c
    set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = v_note
    where c.id = v_row.id
    returning * into v_row;
  elsif to_status = 'published' then
    update public.awareness_content c
    set review_status = 'published',
        published_at = case when v_from = 'published' then c.published_at else now() end,
        reviewed_by = case when v_from = 'published' then auth.uid() else c.reviewed_by end,
        reviewed_at = case when v_from = 'published' then now() else c.reviewed_at end,
        review_note = coalesce(v_note, c.review_note),
        next_review_due = (current_date + make_interval(months => v_months))::date,
        review_reminded_at = null
    where c.id = v_row.id
    returning * into v_row;
  elsif to_status = 'draft' then
    update public.awareness_content c
    set review_status = 'draft', reviewed_by = null, reviewed_at = null,
        review_note = coalesce(v_note, c.review_note), published_at = null, next_review_due = null
    where c.id = v_row.id
    returning * into v_row;
  else
    update public.awareness_content c
    set review_status = to_status, review_note = coalesce(v_note, c.review_note)
    where c.id = v_row.id
    returning * into v_row;
  end if;

  perform public.write_audit(
    'content_' || to_status::text, 'awareness_content', v_row.id,
    jsonb_build_object('review_status', v_from),
    jsonb_build_object('review_status', to_status, 'note', v_note)
  );

  return v_row;
end;
$$;

-- === re-review reminder (pg_cron, internal) ===================================
create function public.process_content_review_due()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in
    select c.id from public.awareness_content c
    where c.review_status = 'published'
      and c.next_review_due <= current_date
      and c.review_reminded_at is null
    for update skip locked
  loop
    update public.awareness_content set review_reminded_at = now() where id = v_id;
    perform public.enqueue_notification(ur.user_id, 'content_review_due', 'awareness_content', v_id, '{}'::jsonb)
    from public.user_roles ur where ur.role = 'admin';
  end loop;
end;
$$;

select cron.schedule(
  'process-content-review-due',
  '23 3 * * *',
  $$select public.process_content_review_due()$$
);

grant execute on function public.admin_upsert_content_source to authenticated;
grant execute on function public.admin_list_content to authenticated;
grant execute on function public.admin_get_content to authenticated;
grant execute on function public.admin_upsert_content to authenticated;
grant execute on function public.admin_set_content_sources to authenticated;
grant execute on function public.admin_transition_content to authenticated;
