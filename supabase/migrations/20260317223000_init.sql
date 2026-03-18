create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  platform_role text not null default 'freelancer' check (platform_role in ('admin', 'freelancer', 'client')),
  default_workspace_id uuid references public.workspaces (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  portal_user_id uuid unique references auth.users (id) on delete set null,
  email text not null,
  name text not null,
  company_name text,
  notes text,
  status text not null default 'pending_invite' check (status in ('pending_invite', 'active', 'archived')),
  invited_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, email)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  starts_on date,
  due_on date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_clients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  access_role text not null default 'reviewer' check (access_role in ('primary', 'reviewer', 'observer')),
  added_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, client_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  title text not null,
  description text,
  position integer not null default 1,
  due_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'in_review', 'approved', 'blocked')),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  title text not null,
  description text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'changes_requested', 'approved')),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete cascade,
  deliverable_id uuid references public.deliverables (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  visibility text not null default 'workspace' check (visibility in ('workspace', 'project')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plan_entitlements (
  plan_code text primary key,
  plan_name text not null,
  client_limit integer,
  active_project_limit integer,
  portal_enabled boolean not null default false,
  ai_enabled boolean not null default false,
  realtime_enabled boolean not null default false,
  saved_session_days integer not null default 30,
  monthly_ai_run_limit integer,
  premium_ai_mode boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  plan_code text not null references public.plan_entitlements (plan_code),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'unpaid', 'canceled')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  last_event_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  livemode boolean not null default false,
  status text not null default 'processed' check (status in ('processed', 'duplicate', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tool_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  tool_type text not null check (tool_type in ('proposal_generator', 'brief_analyzer', 'checklist_builder')),
  title text not null,
  latest_status text not null default 'queued' check (latest_status in ('queued', 'running', 'succeeded', 'failed')),
  input_preview text,
  last_run_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tool_sessions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  tool_type text not null check (tool_type in ('proposal_generator', 'brief_analyzer', 'checklist_builder')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  premium_mode boolean not null default false,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  provider text,
  model text,
  usage_input_tokens integer,
  usage_output_tokens integer,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists clients_workspace_id_idx on public.clients (workspace_id);
create index if not exists clients_portal_user_id_idx on public.clients (portal_user_id);
create index if not exists projects_workspace_id_idx on public.projects (workspace_id);
create index if not exists project_clients_project_id_idx on public.project_clients (project_id);
create index if not exists project_clients_client_id_idx on public.project_clients (client_id);
create index if not exists milestones_project_id_idx on public.milestones (project_id);
create index if not exists deliverables_project_id_idx on public.deliverables (project_id);
create index if not exists deliverables_milestone_id_idx on public.deliverables (milestone_id);
create index if not exists comments_project_id_idx on public.comments (project_id);
create index if not exists comments_deliverable_id_idx on public.comments (deliverable_id);
create index if not exists activity_events_workspace_id_idx on public.activity_events (workspace_id, created_at desc);
create index if not exists activity_events_project_id_idx on public.activity_events (project_id, created_at desc);
create index if not exists subscriptions_workspace_id_idx on public.subscriptions (workspace_id);
create index if not exists tool_sessions_workspace_id_idx on public.tool_sessions (workspace_id, last_run_at desc);
create index if not exists tool_runs_session_id_idx on public.tool_runs (session_id, created_at desc);
create index if not exists tool_runs_workspace_id_idx on public.tool_runs (workspace_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, 'workspace')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = coalesce(p_user_id, auth.uid())
      and platform_role = 'admin'
  );
$$;

create or replace function public.workspace_effective_plan(p_workspace_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  subscription_row public.subscriptions%rowtype;
begin
  select *
  into subscription_row
  from public.subscriptions
  where workspace_id = p_workspace_id;

  if not found then
    return 'free';
  end if;

  if subscription_row.status in ('active', 'trialing', 'past_due') then
    if subscription_row.cancel_at_period_end
       and subscription_row.current_period_end is not null
       and subscription_row.current_period_end < timezone('utc', now()) then
      return 'free';
    end if;

    return coalesce(subscription_row.plan_code, 'free');
  end if;

  if subscription_row.status = 'canceled'
     and subscription_row.current_period_end is not null
     and subscription_row.current_period_end >= timezone('utc', now()) then
    return coalesce(subscription_row.plan_code, 'free');
  end if;

  return 'free';
end;
$$;

create or replace function public.current_workspace_subscription(p_workspace_id uuid)
returns table (
  plan_code text,
  status text,
  cancel_at_period_end boolean,
  current_period_end timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(s.plan_code, 'free') as plan_code,
    coalesce(s.status, 'inactive') as status,
    coalesce(s.cancel_at_period_end, false) as cancel_at_period_end,
    s.current_period_end
  from (select p_workspace_id as workspace_id) as input_workspace
  left join public.subscriptions s on s.workspace_id = input_workspace.workspace_id;
$$;

create or replace function public.client_has_project_access(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin(p_user_id)
    or exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = p_project_id
        and w.owner_user_id = coalesce(p_user_id, auth.uid())
    )
    or exists (
      select 1
      from public.project_clients pc
      join public.clients c on c.id = pc.client_id
      where pc.project_id = p_project_id
        and c.portal_user_id = coalesce(p_user_id, auth.uid())
        and c.status <> 'archived'
    );
$$;

create or replace function public.has_workspace_feature(
  p_workspace_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with entitlement as (
    select *
    from public.plan_entitlements
    where plan_code = public.workspace_effective_plan(p_workspace_id)
  )
  select case p_feature
    when 'client_portal' then coalesce((select portal_enabled from entitlement), false)
    when 'ai_tools' then coalesce((select ai_enabled from entitlement), false)
    when 'realtime_feed' then coalesce((select realtime_enabled from entitlement), false)
    when 'saved_sessions' then coalesce((select ai_enabled from entitlement), false)
    when 'premium_ai_mode' then coalesce((select premium_ai_mode from entitlement), false)
    else false
  end;
$$;

create or replace function public.workspace_access_snapshot(p_workspace_id uuid)
returns table (
  plan_code text,
  client_limit integer,
  client_count integer,
  active_project_limit integer,
  active_project_count integer,
  monthly_ai_run_limit integer,
  monthly_ai_run_count integer,
  portal_enabled boolean,
  ai_enabled boolean,
  realtime_enabled boolean,
  premium_ai_mode boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_plan as (
    select *
    from public.plan_entitlements
    where plan_code = public.workspace_effective_plan(p_workspace_id)
  )
  select
    coalesce((select plan_code from active_plan), 'free') as plan_code,
    (select client_limit from active_plan) as client_limit,
    (
      select count(*)::integer
      from public.clients
      where workspace_id = p_workspace_id
        and status <> 'archived'
    ) as client_count,
    (select active_project_limit from active_plan) as active_project_limit,
    (
      select count(*)::integer
      from public.projects
      where workspace_id = p_workspace_id
        and status in ('draft', 'active', 'paused')
    ) as active_project_count,
    (select monthly_ai_run_limit from active_plan) as monthly_ai_run_limit,
    (
      select count(*)::integer
      from public.tool_runs
      where workspace_id = p_workspace_id
        and created_at >= date_trunc('month', timezone('utc', now()))
    ) as monthly_ai_run_count,
    coalesce((select portal_enabled from active_plan), false) as portal_enabled,
    coalesce((select ai_enabled from active_plan), false) as ai_enabled,
    coalesce((select realtime_enabled from active_plan), false) as realtime_enabled,
    coalesce((select premium_ai_mode from active_plan), false) as premium_ai_mode;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(nullif(new.raw_user_meta_data ->> 'platform_role', ''), 'freelancer');
  display_name text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));
  requested_workspace_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'workspace_name', ''),
    initcap(display_name) || '''s Workspace'
  );
  requested_workspace_slug text := public.slugify(
    coalesce(nullif(new.raw_user_meta_data ->> 'workspace_slug', ''), requested_workspace_name)
  );
  created_workspace_id uuid;
begin
  if requested_role not in ('admin', 'freelancer', 'client') then
    requested_role := 'freelancer';
  end if;

  insert into public.profiles (user_id, email, full_name, platform_role)
  values (new.id, new.email, display_name, requested_role)
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        platform_role = excluded.platform_role,
        updated_at = timezone('utc', now());

  if requested_role = 'freelancer' then
    insert into public.workspaces (name, slug, owner_user_id)
    values (
      requested_workspace_name,
      requested_workspace_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6),
      new.id
    )
    returning id into created_workspace_id;

    update public.profiles
    set default_workspace_id = created_workspace_id,
        updated_at = timezone('utc', now())
    where user_id = new.id;
  elsif requested_role = 'client' then
    update public.clients
    set portal_user_id = new.id,
        status = case when status = 'pending_invite' then 'active' else status end,
        invited_at = coalesce(invited_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where lower(email) = lower(new.email)
      and portal_user_id is null;

    select workspace_id
    into created_workspace_id
    from public.clients
    where portal_user_id = new.id
    order by created_at
    limit 1;

    if created_workspace_id is not null then
      update public.profiles
      set default_workspace_id = created_workspace_id,
          updated_at = timezone('utc', now())
      where user_id = new.id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.record_activity_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  payload_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  payload_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  workspace_value uuid;
  project_value uuid;
  actor_value uuid;
  event_visibility text := 'workspace';
  entity_value uuid := coalesce((payload_new ->> 'id')::uuid, (payload_old ->> 'id')::uuid);
begin
  if tg_table_name = 'clients' then
    workspace_value := coalesce((payload_new ->> 'workspace_id')::uuid, (payload_old ->> 'workspace_id')::uuid);
    actor_value := coalesce((payload_new ->> 'created_by')::uuid, auth.uid());
  elsif tg_table_name = 'projects' then
    workspace_value := coalesce((payload_new ->> 'workspace_id')::uuid, (payload_old ->> 'workspace_id')::uuid);
    project_value := coalesce((payload_new ->> 'id')::uuid, (payload_old ->> 'id')::uuid);
    actor_value := coalesce((payload_new ->> 'created_by')::uuid, auth.uid());
    event_visibility := 'project';
  elsif tg_table_name = 'milestones' then
    project_value := coalesce((payload_new ->> 'project_id')::uuid, (payload_old ->> 'project_id')::uuid);
    actor_value := coalesce((payload_new ->> 'created_by')::uuid, auth.uid());
    event_visibility := 'project';
    select workspace_id into workspace_value from public.projects where id = project_value;
  elsif tg_table_name = 'deliverables' then
    project_value := coalesce((payload_new ->> 'project_id')::uuid, (payload_old ->> 'project_id')::uuid);
    actor_value := coalesce((payload_new ->> 'created_by')::uuid, auth.uid());
    event_visibility := 'project';
    select workspace_id into workspace_value from public.projects where id = project_value;
  elsif tg_table_name = 'comments' then
    project_value := coalesce((payload_new ->> 'project_id')::uuid, (payload_old ->> 'project_id')::uuid);
    actor_value := coalesce((payload_new ->> 'author_user_id')::uuid, auth.uid());
    event_visibility := 'project';
    select workspace_id into workspace_value from public.projects where id = project_value;
  end if;

  if workspace_value is null then
    return coalesce(new, old);
  end if;

  insert into public.activity_events (
    workspace_id,
    project_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    visibility,
    payload
  )
  values (
    workspace_value,
    project_value,
    actor_value,
    lower(tg_table_name) || '.' || lower(tg_op),
    lower(tg_table_name),
    entity_value,
    event_visibility,
    jsonb_build_object(
      'title', coalesce(payload_new ->> 'title', payload_old ->> 'title', payload_new ->> 'name', payload_old ->> 'name'),
      'status', coalesce(payload_new ->> 'status', payload_old ->> 'status'),
      'operation', lower(tg_op)
    )
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.review_deliverable(
  p_deliverable_id uuid,
  p_decision text,
  p_comment text default null
)
returns public.deliverables
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deliverable_row public.deliverables%rowtype;
  project_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Invalid review decision';
  end if;

  select *
  into deliverable_row
  from public.deliverables
  where id = p_deliverable_id;

  if not found then
    raise exception 'Deliverable not found';
  end if;

  select workspace_id
  into project_workspace_id
  from public.projects
  where id = deliverable_row.project_id;

  if not public.client_has_project_access(deliverable_row.project_id, current_user_id) then
    raise exception 'Not authorized to review this deliverable';
  end if;

  update public.deliverables
  set status = p_decision,
      approved_at = case when p_decision = 'approved' then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
  where id = p_deliverable_id
  returning * into deliverable_row;

  if deliverable_row.status = 'changes_requested' then
    update public.milestones
    set status = 'blocked',
        updated_at = timezone('utc', now())
    where id = deliverable_row.milestone_id;
  elsif not exists (
    select 1
    from public.deliverables
    where milestone_id = deliverable_row.milestone_id
      and status <> 'approved'
  ) then
    update public.milestones
    set status = 'approved',
        approved_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where id = deliverable_row.milestone_id;
  end if;

  if p_comment is not null and length(trim(p_comment)) > 0 then
    insert into public.comments (
      project_id,
      milestone_id,
      deliverable_id,
      author_user_id,
      body
    )
    values (
      deliverable_row.project_id,
      deliverable_row.milestone_id,
      deliverable_row.id,
      current_user_id,
      p_comment
    );
  end if;

  insert into public.activity_events (
    workspace_id,
    project_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    visibility,
    payload
  )
  values (
    project_workspace_id,
    deliverable_row.project_id,
    current_user_id,
    'deliverables.reviewed',
    'deliverables',
    deliverable_row.id,
    'project',
    jsonb_build_object('status', p_decision)
  );

  return deliverable_row;
end;
$$;

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.touch_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists set_milestones_updated_at on public.milestones;
create trigger set_milestones_updated_at
before update on public.milestones
for each row execute function public.touch_updated_at();

drop trigger if exists set_deliverables_updated_at on public.deliverables;
create trigger set_deliverables_updated_at
before update on public.deliverables
for each row execute function public.touch_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

drop trigger if exists set_stripe_customers_updated_at on public.stripe_customers;
create trigger set_stripe_customers_updated_at
before update on public.stripe_customers
for each row execute function public.touch_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists set_tool_sessions_updated_at on public.tool_sessions;
create trigger set_tool_sessions_updated_at
before update on public.tool_sessions
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists activity_events_for_clients on public.clients;
create trigger activity_events_for_clients
after insert or update on public.clients
for each row execute function public.record_activity_event();

drop trigger if exists activity_events_for_projects on public.projects;
create trigger activity_events_for_projects
after insert or update on public.projects
for each row execute function public.record_activity_event();

drop trigger if exists activity_events_for_milestones on public.milestones;
create trigger activity_events_for_milestones
after insert or update on public.milestones
for each row execute function public.record_activity_event();

drop trigger if exists activity_events_for_deliverables on public.deliverables;
create trigger activity_events_for_deliverables
after insert or update on public.deliverables
for each row execute function public.record_activity_event();

drop trigger if exists activity_events_for_comments on public.comments;
create trigger activity_events_for_comments
after insert on public.comments
for each row execute function public.record_activity_event();

insert into public.plan_entitlements (
  plan_code,
  plan_name,
  client_limit,
  active_project_limit,
  portal_enabled,
  ai_enabled,
  realtime_enabled,
  saved_session_days,
  monthly_ai_run_limit,
  premium_ai_mode
)
values
  ('free', 'Free', 1, 1, false, false, false, 30, 0, false),
  ('pro', 'Pro', null, null, true, true, true, 365, 50, false),
  ('studio', 'Studio', null, null, true, true, true, 365, 200, true)
on conflict (plan_code) do update
set
  plan_name = excluded.plan_name,
  client_limit = excluded.client_limit,
  active_project_limit = excluded.active_project_limit,
  portal_enabled = excluded.portal_enabled,
  ai_enabled = excluded.ai_enabled,
  realtime_enabled = excluded.realtime_enabled,
  saved_session_days = excluded.saved_session_days,
  monthly_ai_run_limit = excluded.monthly_ai_run_limit,
  premium_ai_mode = excluded.premium_ai_mode;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_clients enable row level security;
alter table public.milestones enable row level security;
alter table public.deliverables enable row level security;
alter table public.comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.tool_sessions enable row level security;
alter table public.tool_runs enable row level security;

create policy "workspace owners and admins can view workspaces"
on public.workspaces
for select
using (owner_user_id = auth.uid() or public.is_admin());

create policy "workspace owners and admins can modify workspaces"
on public.workspaces
for update
using (owner_user_id = auth.uid() or public.is_admin())
with check (owner_user_id = auth.uid() or public.is_admin());

create policy "workspace owners can insert workspaces"
on public.workspaces
for insert
with check (owner_user_id = auth.uid() or public.is_admin());

create policy "workspace owners can delete workspaces"
on public.workspaces
for delete
using (owner_user_id = auth.uid() or public.is_admin());

create policy "users can read own profile or admins can read all"
on public.profiles
for select
using (user_id = auth.uid() or public.is_admin());

create policy "users can update own profile or admins can update all"
on public.profiles
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "any authenticated user can read plan entitlements"
on public.plan_entitlements
for select
using (auth.role() = 'authenticated');

create policy "workspace owners and admins can manage clients"
on public.clients
for all
using (
  exists (
    select 1
    from public.workspaces w
    where w.id = clients.workspace_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    where w.id = clients.workspace_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
);

create policy "clients can read their own client record"
on public.clients
for select
using (portal_user_id = auth.uid());

create policy "workspace owners and admins can manage projects"
on public.projects
for all
using (
  exists (
    select 1
    from public.workspaces w
    where w.id = projects.workspace_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    where w.id = projects.workspace_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
);

create policy "clients can read assigned projects"
on public.projects
for select
using (public.client_has_project_access(id));

create policy "workspace owners and admins can manage project assignments"
on public.project_clients
for all
using (
  exists (
    select 1
    from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = project_clients.project_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = project_clients.project_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
);

create policy "clients can read their own project assignments"
on public.project_clients
for select
using (
  exists (
    select 1
    from public.clients c
    where c.id = project_clients.client_id
      and c.portal_user_id = auth.uid()
  )
);

create policy "authorized users can read milestones"
on public.milestones
for select
using (public.client_has_project_access(project_id));

create policy "workspace owners and admins can manage milestones"
on public.milestones
for all
using (
  exists (
    select 1
    from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = milestones.project_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = milestones.project_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
);

create policy "authorized users can read deliverables"
on public.deliverables
for select
using (public.client_has_project_access(project_id));

create policy "workspace owners and admins can manage deliverables"
on public.deliverables
for all
using (
  exists (
    select 1
    from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = deliverables.project_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = deliverables.project_id
      and (w.owner_user_id = auth.uid() or public.is_admin())
  )
);

create policy "authorized users can read comments"
on public.comments
for select
using (public.client_has_project_access(project_id));

create policy "authorized users can add comments to visible projects"
on public.comments
for insert
with check (
  author_user_id = auth.uid()
  and public.client_has_project_access(project_id)
);

create policy "authors and admins can update comments"
on public.comments
for update
using (author_user_id = auth.uid() or public.is_admin())
with check (author_user_id = auth.uid() or public.is_admin());

create policy "authors and admins can delete comments"
on public.comments
for delete
using (author_user_id = auth.uid() or public.is_admin());

create policy "authorized viewers can read activity events"
on public.activity_events
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.workspaces w
    where w.id = activity_events.workspace_id
      and w.owner_user_id = auth.uid()
  )
  or (
    activity_events.visibility = 'project'
    and activity_events.project_id is not null
    and public.client_has_project_access(activity_events.project_id)
  )
);

create policy "workspace owners and admins can insert activity events"
on public.activity_events
for insert
with check (
  public.is_admin()
  or (
    actor_user_id = auth.uid()
    and exists (
      select 1
      from public.workspaces w
      where w.id = activity_events.workspace_id
        and w.owner_user_id = auth.uid()
    )
  )
);

create policy "workspace owners and admins can read stripe customers"
on public.stripe_customers
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.workspaces w
    where w.id = stripe_customers.workspace_id
      and w.owner_user_id = auth.uid()
  )
);

create policy "workspace owners and admins can read subscriptions"
on public.subscriptions
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.workspaces w
    where w.id = subscriptions.workspace_id
      and w.owner_user_id = auth.uid()
  )
);

create policy "admins can read stripe events"
on public.stripe_events
for select
using (public.is_admin());

create policy "workspace owners and admins can manage tool sessions"
on public.tool_sessions
for all
using (
  public.is_admin()
  or (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.workspaces w
      where w.id = tool_sessions.workspace_id
        and w.owner_user_id = auth.uid()
    )
  )
)
with check (
  public.is_admin()
  or (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.workspaces w
      where w.id = tool_sessions.workspace_id
        and w.owner_user_id = auth.uid()
    )
  )
);

create policy "workspace owners and admins can manage tool runs"
on public.tool_runs
for all
using (
  public.is_admin()
  or (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.workspaces w
      where w.id = tool_runs.workspace_id
        and w.owner_user_id = auth.uid()
    )
  )
)
with check (
  public.is_admin()
  or (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.workspaces w
      where w.id = tool_runs.workspace_id
        and w.owner_user_id = auth.uid()
    )
  )
);
