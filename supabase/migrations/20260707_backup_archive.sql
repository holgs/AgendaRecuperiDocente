-- Migration: Backup / archive table for school-year data exports (Punto 2)
-- Description: Stores verified backup copies of a school year's data inside the same
--              Supabase project. Admin-only via RLS. A backup row must exist and be
--              up to date before a year's data can be deleted (see delete-year API).
-- Date: 2026-07-07
--
-- Self-contained: the admin check is inlined (matches auth JWT email to users.role),
-- so this migration does not depend on the is_admin() helper. The subquery reads only
-- the caller's own users row, which is permitted by the users_select_self RLS policy.

create table if not exists public.year_backups (
  id               uuid primary key default extensions.uuid_generate_v4(),
  -- kept as SET NULL so a backup survives even if the school_year row is later removed
  school_year_id   uuid references public.school_years(id) on delete set null,
  school_year_name text not null,
  payload          jsonb not null,       -- full JSON export of the year's data
  row_counts       jsonb not null,       -- {"teacher_budgets": n, "recovery_activities": n}
  format_version   integer not null default 1,
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_year_backups_school_year
  on public.year_backups(school_year_id);

create index if not exists idx_year_backups_created_at
  on public.year_backups(created_at desc);

comment on table public.year_backups is
  'Verified backup copies of a school year''s data (Punto 2). Admin-only. Required before year deletion.';

-- RLS: admin only
alter table public.year_backups enable row level security;

drop policy if exists year_backups_admin_all on public.year_backups;
create policy year_backups_admin_all on public.year_backups
  for all to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.email = (auth.jwt() ->> 'email') and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.email = (auth.jwt() ->> 'email') and u.role = 'admin'
    )
  );

-- =============================================================================
-- ROLLBACK (paste manually only if needed)
-- =============================================================================
-- drop table if exists public.year_backups;
