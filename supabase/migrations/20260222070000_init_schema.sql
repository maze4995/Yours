create extension if not exists pgcrypto;

create type public.user_role as enum ('USER', 'MAKER', 'ADMIN');
create type public.request_status as enum ('draft', 'open', 'selected', 'canceled');
create type public.bid_status as enum ('submitted', 'withdrawn', 'accepted', 'rejected');
create type public.project_status as enum ('active', 'delivered', 'accepted', 'closed');
create type public.priority_level as enum ('low', 'medium', 'high');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'USER',
  full_name text,
  job_title text,
  industry text,
  team_size int,
  pain_points text[] not null default '{}',
  goals text[] not null default '{}',
  current_tools text[] not null default '{}',
  budget_preference text,
  deadline_preference text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maker_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  headline text,
  bio text,
  skills text[] not null default '{}',
  portfolio_links text[] not null default '{}',
  is_verified boolean not null default false,
  verification_badge text not null default 'Verified Maker',
  rating numeric(2, 1),
  completed_projects_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maker_profiles_max_portfolio_links check (
    coalesce(array_length(portfolio_links, 1), 0) <= 3
  )
);

create table public.software_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  target_roles text[] not null default '{}',
  tags text[] not null default '{}',
  description text not null default '',
  pricing_model text,
  website_url text,
  key_features text[] not null default '{}',
  pros_template text[] not null default '{}',
  cons_template text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_fingerprint text not null,
  profile_snapshot jsonb not null,
  candidate_ids uuid[] not null,
  items jsonb not null,
  fit_decision text not null check (fit_decision in ('software_fit', 'custom_build')),
  fit_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendations_user_fingerprint_unique unique (user_id, profile_fingerprint)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  summary text not null,
  requirements text not null,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  deadline_date date,
  priority public.priority_level not null default 'medium',
  status public.request_status not null default 'open',
  recommendation_id uuid references public.recommendations (id) on delete set null,
  selected_bid_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_budget_range check (
    budget_min is null
    or budget_max is null
    or budget_min <= budget_max
  )
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  maker_id uuid not null references auth.users (id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  delivery_days int not null check (delivery_days > 0),
  approach_summary text not null,
  maintenance_option text not null,
  portfolio_link text,
  status public.bid_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bids_unique_request_maker unique (request_id, maker_id)
);

alter table public.requests
add constraint requests_selected_bid_fkey foreign key (selected_bid_id) references public.bids (id) on delete set null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  maker_id uuid not null references auth.users (id) on delete cascade,
  accepted_bid_id uuid not null unique references public.bids (id) on delete restrict,
  status public.project_status not null default 'active',
  payment_placeholder text not null default '착수금/결제 연동 예정',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  event_note text,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index maker_profiles_verified_idx on public.maker_profiles (is_verified);
create index software_catalog_category_active_idx on public.software_catalog (category, is_active);
create index recommendations_user_created_idx on public.recommendations (user_id, created_at desc);
create index requests_user_status_created_idx on public.requests (user_id, status, created_at desc);
create index requests_status_created_idx on public.requests (status, created_at desc);
create index bids_request_status_created_idx on public.bids (request_id, status, created_at desc);
create index bids_maker_created_idx on public.bids (maker_id, created_at desc);
create index projects_user_created_idx on public.projects (user_id, created_at desc);
create index projects_maker_created_idx on public.projects (maker_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_maker_profiles_updated_at
before update on public.maker_profiles
for each row
execute function public.set_updated_at();

create trigger set_software_catalog_updated_at
before update on public.software_catalog
for each row
execute function public.set_updated_at();

create trigger set_recommendations_updated_at
before update on public.recommendations
for each row
execute function public.set_updated_at();

create trigger set_requests_updated_at
before update on public.requests
for each row
execute function public.set_updated_at();

create trigger set_bids_updated_at
before update on public.bids
for each row
execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'USER')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  );
$$;

create or replace function public.is_verified_maker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.maker_profiles mp
      on mp.user_id = p.id
    where p.id = auth.uid()
      and p.role = 'MAKER'
      and mp.is_verified = true
  );
$$;

create or replace function public.rpc_list_open_requests(limit_count int default 10, offset_count int default 0)
returns table (
  request_id uuid,
  title text,
  summary text,
  budget_min numeric,
  budget_max numeric,
  deadline_date date,
  priority public.priority_level,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not public.is_verified_maker() and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    r.id as request_id,
    r.title,
    r.summary,
    r.budget_min,
    r.budget_max,
    r.deadline_date,
    r.priority,
    r.created_at
  from public.requests r
  where r.status = 'open'
  order by r.created_at desc
  limit least(greatest(limit_count, 1), 10)
  offset greatest(offset_count, 0);
end;
$$;

create or replace function public.accept_bid_and_create_project(p_request_id uuid, p_bid_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  req public.requests%rowtype;
  selected_bid public.bids%rowtype;
  new_project_id uuid;
begin
  if current_user is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select *
  into req
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status <> 'open' then
    raise exception 'REQUEST_NOT_OPEN';
  end if;

  if req.user_id <> current_user and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into selected_bid
  from public.bids
  where id = p_bid_id
    and request_id = p_request_id
  for update;

  if not found then
    raise exception 'BID_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.projects p
    where p.request_id = p_request_id
  ) then
    raise exception 'PROJECT_ALREADY_EXISTS';
  end if;

  update public.bids
  set status = 'accepted',
      updated_at = now()
  where id = p_bid_id;

  update public.bids
  set status = 'rejected',
      updated_at = now()
  where request_id = p_request_id
    and id <> p_bid_id
    and status = 'submitted';

  update public.requests
  set status = 'selected',
      selected_bid_id = p_bid_id,
      updated_at = now()
  where id = p_request_id;

  insert into public.projects (
    request_id,
    user_id,
    maker_id,
    accepted_bid_id,
    status
  )
  values (
    p_request_id,
    req.user_id,
    selected_bid.maker_id,
    p_bid_id,
    'active'
  )
  returning id into new_project_id;

  insert into public.project_events (
    project_id,
    actor_id,
    event_type,
    event_note
  )
  values (
    new_project_id,
    current_user,
    'project_created',
    '입찰 선택으로 프로젝트가 생성되었습니다.'
  );

  return new_project_id;
end;
$$;

grant execute on function public.rpc_list_open_requests(int, int) to authenticated;
grant execute on function public.accept_bid_and_create_project(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.maker_profiles enable row level security;
alter table public.software_catalog enable row level security;
alter table public.recommendations enable row level security;
alter table public.requests enable row level security;
alter table public.bids enable row level security;
alter table public.projects enable row level security;
alter table public.project_events enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
with check (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "profiles_delete_admin"
on public.profiles
for delete
using (public.is_admin());

create policy "maker_profiles_select_authenticated"
on public.maker_profiles
for select
using (auth.uid() is not null);

create policy "maker_profiles_insert_own_or_admin"
on public.maker_profiles
for insert
with check (user_id = auth.uid() or public.is_admin());

create policy "maker_profiles_update_own_or_admin"
on public.maker_profiles
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "maker_profiles_delete_admin"
on public.maker_profiles
for delete
using (public.is_admin());

create policy "software_catalog_select_authenticated"
on public.software_catalog
for select
using (auth.uid() is not null);

create policy "software_catalog_mutate_admin"
on public.software_catalog
for all
using (public.is_admin())
with check (public.is_admin());

create policy "recommendations_select_own_or_admin"
on public.recommendations
for select
using (user_id = auth.uid() or public.is_admin());

create policy "recommendations_insert_own_or_admin"
on public.recommendations
for insert
with check (user_id = auth.uid() or public.is_admin());

create policy "recommendations_update_own_or_admin"
on public.recommendations
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "recommendations_delete_admin"
on public.recommendations
for delete
using (public.is_admin());

create policy "requests_select_owner_or_admin"
on public.requests
for select
using (user_id = auth.uid() or public.is_admin());

create policy "requests_insert_owner_or_admin"
on public.requests
for insert
with check (user_id = auth.uid() or public.is_admin());

create policy "requests_update_owner_or_admin"
on public.requests
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "requests_delete_owner_or_admin"
on public.requests
for delete
using (user_id = auth.uid() or public.is_admin());

create policy "bids_select_owner_maker_or_admin"
on public.bids
for select
using (
  maker_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.requests r
    where r.id = bids.request_id
      and r.user_id = auth.uid()
  )
);

create policy "bids_insert_verified_maker"
on public.bids
for insert
with check (
  maker_id = auth.uid()
  and (public.is_verified_maker() or public.is_admin())
  and exists (
    select 1
    from public.requests r
    where r.id = bids.request_id
      and r.status = 'open'
  )
);

create policy "bids_update_maker_withdraw_or_admin"
on public.bids
for update
using (maker_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    maker_id = auth.uid()
    and status in ('submitted', 'withdrawn')
  )
);

create policy "bids_delete_admin"
on public.bids
for delete
using (public.is_admin());

create policy "projects_select_participants_or_admin"
on public.projects
for select
using (user_id = auth.uid() or maker_id = auth.uid() or public.is_admin());

create policy "projects_insert_admin_only"
on public.projects
for insert
with check (public.is_admin());

create policy "projects_update_participants_or_admin"
on public.projects
for update
using (user_id = auth.uid() or maker_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or maker_id = auth.uid() or public.is_admin());

create policy "projects_delete_admin"
on public.projects
for delete
using (public.is_admin());

create policy "project_events_select_participants_or_admin"
on public.project_events
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.projects p
    where p.id = project_events.project_id
      and (p.user_id = auth.uid() or p.maker_id = auth.uid())
  )
);

create policy "project_events_insert_participants_or_admin"
on public.project_events
for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.projects p
    where p.id = project_events.project_id
      and (p.user_id = auth.uid() or p.maker_id = auth.uid())
  )
);

create policy "project_events_update_admin"
on public.project_events
for update
using (public.is_admin())
with check (public.is_admin());

create policy "project_events_delete_admin"
on public.project_events
for delete
using (public.is_admin());
