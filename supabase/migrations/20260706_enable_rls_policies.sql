-- Migration: Enable Row Level Security + policies on all application tables
-- Description: Fixes CRITICAL finding C1 of SECURITY-AUDIT.md — RLS was absent/permissive,
--              so the public anon key could read and write every table. This migration
--              enables RLS on all 8 tables and adds admin/teacher policies.
-- Date: 2026-07-06
--
-- IDENTITY MODEL (important): the whole app (both server and browser Supabase clients)
-- authenticates with the ANON key + the user's session JWT, i.e. every query runs as the
-- Postgres role `authenticated`. The app resolves the application user by EMAIL
-- (users.email = auth JWT email), so these policies do the same for consistency with the
-- currently working behavior. The `service_role` key (used only server-side, if ever)
-- bypasses RLS by design and is unaffected.
--
-- After applying, the `anon` role has NO policies on these tables, so unauthenticated
-- access returns zero rows / is denied. See verification block at the bottom.

-- =============================================================================
-- 1. HELPER FUNCTIONS
--    SECURITY DEFINER so they can read users/teachers without being blocked by RLS
--    (and to avoid recursive policy evaluation on the users table). search_path is
--    pinned to prevent search-path hijacking.
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  );
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.email = (auth.jwt() ->> 'email')
  limit 1;
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teachers t
  where t.email = (auth.jwt() ->> 'email')
  limit 1;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_teacher_id() to authenticated;

-- =============================================================================
-- 2. ENABLE RLS ON ALL TABLES
-- =============================================================================

alter table public.users               enable row level security;
alter table public.teachers            enable row level security;
alter table public.school_years        enable row level security;
alter table public.teacher_budgets     enable row level security;
alter table public.recovery_types      enable row level security;
alter table public.recovery_activities enable row level security;
alter table public.activity_logs       enable row level security;
alter table public.system_configs      enable row level security;

-- =============================================================================
-- 3. POLICIES
--    (drop-if-exists first so this migration is safely re-runnable)
--    Policy expressions wrap helper calls in `(select ...)` so Postgres evaluates
--    them once per statement instead of once per row (Supabase perf best practice).
-- =============================================================================

-- ---- users -----------------------------------------------------------------
drop policy if exists users_admin_all   on public.users;
drop policy if exists users_select_self on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self on public.users;

create policy users_admin_all on public.users
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy users_select_self on public.users
  for select to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Self auto-provisioning is limited to role 'teacher' to prevent privilege escalation
-- (addresses finding H1). Admins are created explicitly by another admin, never self-service.
create policy users_insert_self on public.users
  for insert to authenticated
  with check (email = (auth.jwt() ->> 'email') and role = 'teacher');

create policy users_update_self on public.users
  for update to authenticated
  using (email = (auth.jwt() ->> 'email'))
  with check (email = (auth.jwt() ->> 'email') and role = 'teacher');

-- ---- teachers --------------------------------------------------------------
drop policy if exists teachers_admin_all   on public.teachers;
drop policy if exists teachers_select_self on public.teachers;

create policy teachers_admin_all on public.teachers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy teachers_select_self on public.teachers
  for select to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- ---- school_years ----------------------------------------------------------
-- All authenticated users may read (needed for dropdowns / planning); only admin writes.
drop policy if exists school_years_admin_all    on public.school_years;
drop policy if exists school_years_select_auth  on public.school_years;

create policy school_years_admin_all on public.school_years
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy school_years_select_auth on public.school_years
  for select to authenticated
  using (true);

-- ---- teacher_budgets -------------------------------------------------------
drop policy if exists budgets_admin_all  on public.teacher_budgets;
drop policy if exists budgets_select_own on public.teacher_budgets;

create policy budgets_admin_all on public.teacher_budgets
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy budgets_select_own on public.teacher_budgets
  for select to authenticated
  using (teacher_id = (select public.current_teacher_id()));

-- ---- recovery_types --------------------------------------------------------
-- All authenticated users may read active types (needed to plan); only admin writes.
drop policy if exists recovery_types_admin_all   on public.recovery_types;
drop policy if exists recovery_types_select_auth on public.recovery_types;

create policy recovery_types_admin_all on public.recovery_types
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy recovery_types_select_auth on public.recovery_types
  for select to authenticated
  using (true);

-- ---- recovery_activities ---------------------------------------------------
-- Admin: full access. Teacher: read own; create own; update/delete only own PLANNED rows.
drop policy if exists activities_admin_all    on public.recovery_activities;
drop policy if exists activities_select_own   on public.recovery_activities;
drop policy if exists activities_insert_own   on public.recovery_activities;
drop policy if exists activities_update_own   on public.recovery_activities;
drop policy if exists activities_delete_own   on public.recovery_activities;

create policy activities_admin_all on public.recovery_activities
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy activities_select_own on public.recovery_activities
  for select to authenticated
  using (teacher_id = (select public.current_teacher_id()));

create policy activities_insert_own on public.recovery_activities
  for insert to authenticated
  with check (teacher_id = (select public.current_teacher_id()));

create policy activities_update_own on public.recovery_activities
  for update to authenticated
  using (teacher_id = (select public.current_teacher_id()) and status = 'planned')
  with check (teacher_id = (select public.current_teacher_id()));

create policy activities_delete_own on public.recovery_activities
  for delete to authenticated
  using (teacher_id = (select public.current_teacher_id()) and status = 'planned');

-- ---- activity_logs ---------------------------------------------------------
-- Admin: full access (read audit trail). Any authenticated user may append a log row
-- attributed to themselves; nobody but admin may read them.
drop policy if exists logs_admin_all   on public.activity_logs;
drop policy if exists logs_insert_self on public.activity_logs;

create policy logs_admin_all on public.activity_logs
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy logs_insert_self on public.activity_logs
  for insert to authenticated
  with check (user_id = (select public.current_app_user_id()));

-- ---- system_configs --------------------------------------------------------
-- All authenticated users may read config (e.g. minutes_per_module); only admin writes.
drop policy if exists system_configs_admin_all   on public.system_configs;
drop policy if exists system_configs_select_auth on public.system_configs;

create policy system_configs_admin_all on public.system_configs
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy system_configs_select_auth on public.system_configs
  for select to authenticated
  using (true);

-- =============================================================================
-- 4. VERIFICATION (run manually after applying)
-- =============================================================================
-- As the anon role (public key), every table below must return 0 rows / be denied:
--   set role anon;
--   select count(*) from public.users;            -- expect: permission denied / 0
--   reset role;
-- As an admin session (via the app) all data must remain visible and writable.
-- As a teacher session, only that teacher's own budgets/activities must be visible.

-- =============================================================================
-- ROLLBACK (do NOT run as part of the migration — paste manually only if needed
--           to revert to the previous, insecure, wide-open state)
-- =============================================================================
-- alter table public.users               disable row level security;
-- alter table public.teachers            disable row level security;
-- alter table public.school_years        disable row level security;
-- alter table public.teacher_budgets     disable row level security;
-- alter table public.recovery_types      disable row level security;
-- alter table public.recovery_activities disable row level security;
-- alter table public.activity_logs       disable row level security;
-- alter table public.system_configs      disable row level security;
-- drop function if exists public.is_admin();
-- drop function if exists public.current_app_user_id();
-- drop function if exists public.current_teacher_id();
