-- Migration: Per-day / per-slot module duration grid (Punto 3)
-- Description: The admin defines, for each weekday and module slot, how many minutes
--              that module lasts (e.g. Monday 3rd module = 60 min). When a teacher
--              records a recovery for a given date + module slot, the system looks up
--              the matching duration here and deducts those minutes from the teacher's
--              minute budget. The chosen duration is frozen onto the activity, so later
--              edits to this grid never change past calculations (historization).
-- Date: 2026-07-08
--
-- Grid is scoped per school_year so each year can have its own timetable.
-- day_of_week uses ISO numbering: 1=Monday .. 7=Sunday.
-- Self-contained admin check (inline), consistent with 20260707_backup_archive.sql.

create table if not exists public.module_durations (
  id               uuid primary key default extensions.uuid_generate_v4(),
  school_year_id   uuid not null references public.school_years(id) on delete cascade,
  day_of_week      smallint not null check (day_of_week between 1 and 7),
  module_number    smallint not null check (module_number between 1 and 20),
  duration_minutes integer  not null check (duration_minutes > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (school_year_id, day_of_week, module_number)
);

create index if not exists idx_module_durations_year
  on public.module_durations(school_year_id);

comment on table public.module_durations is
  'Admin-defined duration (minutes) per weekday + module slot, per school year (Punto 3).';

alter table public.module_durations enable row level security;

-- Admin: full control over the grid.
drop policy if exists module_durations_admin_all on public.module_durations;
create policy module_durations_admin_all on public.module_durations
  for all to authenticated
  using (
    exists (select 1 from public.users u
      where u.email = (auth.jwt() ->> 'email') and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u
      where u.email = (auth.jwt() ->> 'email') and u.role = 'admin')
  );

-- Any authenticated user (teachers) may read the grid, needed to compute the
-- duration when they record their own recovery activities.
drop policy if exists module_durations_select_auth on public.module_durations;
create policy module_durations_select_auth on public.module_durations
  for select to authenticated
  using (true);

-- =============================================================================
-- ROLLBACK (paste manually only if needed)
-- =============================================================================
-- drop table if exists public.module_durations;
