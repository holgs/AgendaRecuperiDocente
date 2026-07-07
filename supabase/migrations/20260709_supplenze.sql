-- Migration: Supplenze (substitutions) — Punto 4
-- Description: External substitute teachers cover an absent teacher for a period.
--   Minutes of the substitution = weeks * absent-teacher's weekly minutes.
--   Impact on recovery budgets (teacher_budgets.minutes_annual):
--     - substitute (supplente): +total_minutes  (accrues recovery debt)
--     - absent    (sostituito): -total_minutes  (discounted, is away)
--   The supplenza row is kept so the impact can be reversed on delete.
-- Date: 2026-07-09
--
-- Self-contained admin RLS check (inline), consistent with previous migrations.

-- Flag external substitute teachers (created on the fly when a supplenza is recorded).
alter table public.teachers
  add column if not exists is_external boolean not null default false;

comment on column public.teachers.is_external is
  'True for external substitute teachers created via a supplenza (Punto 4).';

create table if not exists public.supplenze (
  id             uuid primary key default extensions.uuid_generate_v4(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  sostituito_id  uuid not null references public.teachers(id) on delete restrict,
  supplente_id   uuid not null references public.teachers(id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  weeks          integer not null check (weeks > 0),
  weekly_minutes integer not null check (weekly_minutes >= 0),
  total_minutes  integer not null check (total_minutes >= 0),
  note           text,
  created_by     uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_supplenze_year on public.supplenze(school_year_id);
create index if not exists idx_supplenze_sostituito on public.supplenze(sostituito_id);
create index if not exists idx_supplenze_supplente on public.supplenze(supplente_id);

comment on table public.supplenze is
  'Substitutions: external supplente covers an absent teacher; impacts both recovery budgets (Punto 4).';

alter table public.supplenze enable row level security;

drop policy if exists supplenze_admin_all on public.supplenze;
create policy supplenze_admin_all on public.supplenze
  for all to authenticated
  using (
    exists (select 1 from public.users u
      where u.email = (auth.jwt() ->> 'email') and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u
      where u.email = (auth.jwt() ->> 'email') and u.role = 'admin')
  );

-- =============================================================================
-- ROLLBACK (manuale se serve)
-- =============================================================================
-- drop table if exists public.supplenze;
-- alter table public.teachers drop column if exists is_external;
