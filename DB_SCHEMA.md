# DB_SCHEMA.md

## 1. Enum 정의

```sql
create type public.user_role as enum ('USER', 'MAKER', 'ADMIN');
create type public.request_status as enum ('draft', 'open', 'selected', 'canceled');
create type public.bid_status as enum ('submitted', 'withdrawn', 'accepted', 'rejected');
create type public.project_status as enum ('active', 'delivered', 'accepted', 'closed');
create type public.priority_level as enum ('low', 'medium', 'high');
```

## 2. 테이블 스키마

### 2.1 `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `role user_role not null default 'USER'`
- `full_name text`
- `job_title text`
- `industry text`
- `team_size int`
- `pain_points text[] not null default '{}'`
- `goals text[] not null default '{}'`
- `current_tools text[] not null default '{}'`
- `budget_preference text`
- `deadline_preference text`
- `onboarding_completed boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 2.2 `maker_profiles`

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `headline text`
- `bio text`
- `skills text[] not null default '{}'`
- `portfolio_links text[] not null default '{}'`
- `is_verified boolean not null default false`
- `verification_badge text not null default 'Verified Maker'`
- `rating numeric(2,1)`
- `completed_projects_count int not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- 제약: `array_length(portfolio_links, 1) <= 3`

### 2.3 `software_catalog`

- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `category text not null`
- `target_roles text[] not null default '{}'`
- `tags text[] not null default '{}'`
- `description text not null default ''`
- `pricing_model text`
- `website_url text`
- `key_features text[] not null default '{}'`
- `pros_template text[] not null default '{}'`
- `cons_template text[] not null default '{}'`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 2.4 `recommendations`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `profile_fingerprint text not null`
- `profile_snapshot jsonb not null`
- `candidate_ids uuid[] not null`
- `items jsonb not null`
- `fit_decision text not null check (fit_decision in ('software_fit', 'custom_build'))`
- `fit_reason text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- 유니크: `(user_id, profile_fingerprint)`

### 2.5 `requests`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `summary text not null`
- `requirements text not null`
- `budget_min numeric(12,2)`
- `budget_max numeric(12,2)`
- `deadline_date date`
- `priority priority_level not null default 'medium'`
- `status request_status not null default 'open'`
- `recommendation_id uuid references public.recommendations(id) on delete set null`
- `selected_bid_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- 제약: `budget_min <= budget_max` (둘 다 null 가능)

### 2.6 `bids`

- `id uuid primary key default gen_random_uuid()`
- `request_id uuid not null references public.requests(id) on delete cascade`
- `maker_id uuid not null references auth.users(id) on delete cascade`
- `price numeric(12,2) not null check (price > 0)`
- `delivery_days int not null check (delivery_days > 0)`
- `approach_summary text not null`
- `maintenance_option text not null`
- `portfolio_link text`
- `status bid_status not null default 'submitted'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- 유니크: `(request_id, maker_id)`

### 2.7 `projects`

- `id uuid primary key default gen_random_uuid()`
- `request_id uuid not null unique references public.requests(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `maker_id uuid not null references auth.users(id) on delete cascade`
- `accepted_bid_id uuid not null unique references public.bids(id) on delete restrict`
- `status project_status not null default 'active'`
- `payment_placeholder text not null default '착수금/결제 연동 예정'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 2.8 `project_events`

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references public.projects(id) on delete cascade`
- `actor_id uuid references auth.users(id) on delete set null`
- `event_type text not null`
- `event_note text`
- `created_at timestamptz not null default now()`

## 3. 인덱스/유니크/체크 제약

- `profiles(role)`
- `maker_profiles(is_verified)`
- `software_catalog(category, is_active)`
- `recommendations(user_id, created_at desc)`
- `requests(user_id, status, created_at desc)`
- `requests(status, created_at desc)`
- `bids(request_id, status, created_at desc)`
- `bids(maker_id, created_at desc)`
- `projects(user_id, created_at desc)`
- `projects(maker_id, created_at desc)`
- 체크 제약
  - `budget_min <= budget_max` (둘 다 값이 있을 때)
  - `array_length(portfolio_links,1) <= 3`

## 4. 트랜잭션 함수

### 4.1 `accept_bid_and_create_project(p_request_id uuid, p_bid_id uuid)`

- 보안: `security definer`
- 입력: 요청 ID, 선택한 Bid ID
- 출력: 생성된 `project_id`
- 동작

1. 호출자가 해당 요청의 소유자인지 확인
2. 요청 상태가 `open`인지 확인
3. 선택 Bid가 요청에 속하는지 확인
4. 선택 Bid `accepted`, 나머지 `rejected` 업데이트
5. 요청 상태 `selected` 및 `selected_bid_id` 업데이트
6. `projects` 1건 생성
7. `project_events`에 최초 이벤트 추가
8. 전 과정을 트랜잭션으로 원자 처리

## 5. 시드 데이터 설계

- `software_catalog` 샘플 30개 입력
- 카테고리 예시
  - CRM
  - Marketing Automation
  - Project Management
  - Customer Support
  - HR/Recruiting
  - Data Analytics
  - Finance/Accounting
  - Internal Tooling
- 각 레코드 포함 필드
  - `name`, `category`, `target_roles`, `tags`, `description`, `pricing_model`, `website_url`, `key_features`, `pros_template`, `cons_template`
