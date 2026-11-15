
-- Ejecuta este archivo en Supabase > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'client' check (role in ('client','admin')),
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  phone text not null,
  service text not null check (service in ('Uñas','Pestañas')),
  appointment_date date not null,
  appointment_time time not null,
  details text default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'No está permitido cambiar el rol de usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before update on public.profiles
for each row execute procedure public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "Users can read own profile; admins can read all" on public.profiles;
drop policy if exists "Users can update own push token" on public.profiles;
drop policy if exists "Clients can create own appointment requests" on public.appointments;
drop policy if exists "Clients see own appointments; admins see all" on public.appointments;
drop policy if exists "Admins can update appointment status" on public.appointments;

create policy "Read own profile or admin reads all"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile fields"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "Clients can create own appointment requests"
on public.appointments for insert to authenticated
with check (client_id = auth.uid() and status = 'pending');

create policy "Clients see own appointments; admins see all"
on public.appointments for select to authenticated
using (client_id = auth.uid() or public.is_admin());

create policy "Admins can update appointments"
on public.appointments for update to authenticated
using (public.is_admin())
with check (public.is_admin());
