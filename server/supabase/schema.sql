create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  plan text not null default 'FREE',
  status text not null default 'ACTIVE',
  is_blocked boolean not null default false,
  blocked_at timestamptz,
  last_login_at timestamptz,
  search_usage jsonb,
  billing jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.users add column if not exists status text not null default 'ACTIVE';
alter table public.users add column if not exists is_blocked boolean not null default false;
alter table public.users add column if not exists blocked_at timestamptz;

create table if not exists public.otp_verification (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  last_sent_at timestamptz not null default timezone('utc', now()),
  resend_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_papers (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  paper_id text not null,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  year integer,
  abstract text,
  venue text,
  url text,
  pdf_url text,
  fields_of_study jsonb not null default '[]'::jsonb,
  summary text,
  simplified_abstract text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint saved_papers_user_paper_unique unique (user_id, paper_id)
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'SUPER_ADMIN',
  is_active boolean not null default true,
  failed_login_attempts integer not null default 0,
  last_failed_login_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  status text not null default 'success',
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete set null,
  email text,
  razorpay_subscription_id text,
  razorpay_payment_id text,
  amount_inr numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending',
  plan text not null default 'PRO',
  source text not null default 'razorpay',
  notes jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists payments_razorpay_payment_id_unique
on public.payments (razorpay_payment_id)
where razorpay_payment_id is not null;

create table if not exists public.analytics_data (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  keyword text,
  paper_id text,
  plan text,
  metric_value numeric(12, 4) not null default 1,
  payload jsonb not null default '{}'::jsonb,
  date_key date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feature_controls (
  key text primary key,
  label text not null,
  description text,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.content_papers (
  id bigint generated always as identity primary key,
  paper_id text,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  year integer,
  abstract text,
  venue text,
  url text,
  pdf_url text,
  is_trending boolean not null default false,
  is_featured boolean not null default false,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.feature_controls (key, label, description, enabled, config)
values
  ('ai_features', 'AI Features', 'Controls AI summaries and simplified abstracts.', true, '{}'::jsonb),
  ('ads_enabled', 'Ads Enabled', 'Controls whether free-plan ads should be shown.', true, '{}'::jsonb),
  ('new_features', 'New Features', 'Controls rollout of new beta features.', false, '{}'::jsonb)
on conflict (key) do nothing;

insert into public.site_settings (key, value)
values
  ('site_name', '{"text":"LitFlow"}'::jsonb),
  (
    'branding',
    '{
      "primaryText":"Lit",
      "accentText":"Flow",
      "iconPrimary":"L",
      "iconAccent":"F",
      "logoMode":"generated",
      "logoImageUrl":"",
      "logoDarkImageUrl":"",
      "logoLightImageUrl":"",
      "iconImageUrl":"",
      "iconDarkImageUrl":"",
      "iconLightImageUrl":"",
      "primaryColor":"#60a5fa",
      "secondaryColor":"#2dd4bf",
      "iconLightColor":"#eff6ff",
      "iconAccentColor":"#083344",
      "orbitColor":"#ffffff",
      "tagline":"Research graphs that move with you"
    }'::jsonb
  ),
  ('pricing', '{"free":0,"pro":999,"currency":"INR"}'::jsonb),
  (
    'upgrade_dialog',
    '{
      "badgeText":"Confirm Upgrade",
      "title":"Confirm plan changes",
      "description":"Review your Pro workspace billing details before opening the secure payment checkout.",
      "planTitle":"{siteName} Pro subscription",
      "planDescription":"{billingCycleLabel}",
      "dueTodayLabel":"Due today",
      "cancelButtonLabel":"Cancel",
      "payButtonLabel":"Pay now",
      "taxRate":18,
      "highlightBadges":[
        {"label":"Unlimited research credits","icon":"sparkles"},
        {"label":"Secure backend billing sync","icon":"shield"}
      ],
      "summaryRows":[
        {"label":"Subtotal","value":"{subtotal}"},
        {"label":"Tax {taxRate}%","value":"{tax}"},
        {"label":"Total due today","value":"{total}","emphasized":true}
      ],
      "infoRows":[
        {"label":"Payment method","value":"Secure Razorpay checkout"},
        {"label":"Billing account","value":"{userEmail}"}
      ]
    }'::jsonb
  ),
  ('free_daily_search_limit', '{"value":10}'::jsonb),
  ('smtp', '{"from":"LitFlow <no-reply@litflow.app>"}'::jsonb),
  ('api_keys', '{"semanticScholar":"configured-in-env","openai":"configured-in-env","razorpay":"configured-in-env"}'::jsonb)
on conflict (key) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists otp_verification_set_updated_at on public.otp_verification;
create trigger otp_verification_set_updated_at
before update on public.otp_verification
for each row
execute function public.set_updated_at();

drop trigger if exists saved_papers_set_updated_at on public.saved_papers;
create trigger saved_papers_set_updated_at
before update on public.saved_papers
for each row
execute function public.set_updated_at();

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

drop trigger if exists feature_controls_set_updated_at on public.feature_controls;
create trigger feature_controls_set_updated_at
before update on public.feature_controls
for each row
execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

drop trigger if exists content_papers_set_updated_at on public.content_papers;
create trigger content_papers_set_updated_at
before update on public.content_papers
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.otp_verification enable row level security;
alter table public.saved_papers enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_logs enable row level security;
alter table public.payments enable row level security;
alter table public.analytics_data enable row level security;
alter table public.feature_controls enable row level security;
alter table public.site_settings enable row level security;
alter table public.content_papers enable row level security;
