-- ============================================================
-- نظام الحدي لإدارة مستخدمي الشبكة
-- نفّذ هذا الملف في Supabase: SQL Editor
-- ============================================================

-- 1) الباقات / أنواع الاشتراك --------------------------------
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  duration_days integer not null default 30,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) المستخدمون ----------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text,
  phone text,
  email text,
  address text,
  package_id uuid references public.packages(id) on delete set null,
  subscription_start date,
  subscription_end date,
  monthly_price numeric(12,2) not null default 0,
  status text not null default 'active'
    check (status in ('active', 'expired', 'suspended', 'pending')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) سجل الاشتراكات / التجديدات / المدفوعات -------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null,
  amount numeric(12,2) not null default 0,
  start_date date not null,
  end_date date not null,
  method text not null default 'cash'
    check (method in ('cash', 'transfer', 'card', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

-- 4) ملفات تعريف المديرين -------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin'
    check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- الفهارس ------------------------------------------------------
create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_package on public.users(package_id);
create index if not exists idx_users_end on public.users(subscription_end);
create index if not exists idx_subs_user on public.subscriptions(user_id);
create index if not exists idx_subs_created on public.subscriptions(created_at);

-- دالة تحديث وقت التعديل --------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated
  before update on public.users
  for each row execute function public.set_updated_at();

-- تجديد تلقائي لحالة الاشتراك --------------------------------
create or replace function public.refresh_status()
returns void language sql as $$
  update public.users
  set status = case
    when status = 'suspended' then status
    when subscription_end is null or subscription_end < current_date then 'expired'
    else 'active'
  end
  where status in ('active', 'expired');
$$;

-- الأمان (RLS): نظام داخلي للمشرف فقط -------------------------
alter table public.packages enable row level security;
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.profiles enable row level security;

create policy "admin read packages" on public.packages
  for select to authenticated using (true);
create policy "admin write packages" on public.packages
  for all to authenticated using (true) with check (true);

create policy "admin read users" on public.users
  for select to authenticated using (true);
create policy "admin write users" on public.users
  for all to authenticated using (true) with check (true);

create policy "admin read subscriptions" on public.subscriptions
  for select to authenticated using (true);
create policy "admin write subscriptions" on public.subscriptions
  for all to authenticated using (true) with check (true);

create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- إنشاء ملف تعريف تلقائياً عند التسجيل ------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
