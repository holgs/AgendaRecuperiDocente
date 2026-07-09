-- Migration: teacher contract type + archive flag (Nuovo anno scolastico wizard)
-- Description: classify teachers as 'ruolo' (permanent) or 'tempo_determinato'
--   (fixed-term), and allow archiving those who leave. Archived teachers keep
--   their history and can be reactivated later (e.g. when a fixed-term teacher
--   is hired again). Both fields are set during the year-rollover wizard.
-- Date: 2026-07-09

alter table public.teachers
  add column if not exists contract_type text
    check (contract_type in ('ruolo', 'tempo_determinato')),
  add column if not exists is_archived boolean not null default false;

comment on column public.teachers.contract_type is
  'ruolo (permanent) or tempo_determinato (fixed-term); set during the year rollover.';
comment on column public.teachers.is_archived is
  'Archived teachers are hidden from active management but keep history; reversible.';

create index if not exists idx_teachers_archived
  on public.teachers(is_archived);

-- =============================================================================
-- ROLLBACK (manuale se serve)
-- =============================================================================
-- alter table public.teachers drop column if exists contract_type;
-- alter table public.teachers drop column if exists is_archived;
