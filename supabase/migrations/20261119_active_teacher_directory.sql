-- A deliberately narrow directory for the co-teaching selector. The normal
-- teachers table remains protected by RLS; this function exposes no email,
-- contract, budget or activity data and is callable only by authenticated
-- teachers whose own active teacher record is linked to their app account.
create or replace function public.active_teacher_directory()
returns table (id uuid, cognome character varying, nome character varying)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.cognome, t.nome
  from public.teachers as t
  where not t.is_archived
    and auth.uid() is not null
    and exists (
      select 1
      from public.users as u
      join public.teachers as own_teacher on own_teacher.user_id = u.id
      where u.email = (auth.jwt() ->> 'email')
        and own_teacher.email = u.email
        and u.role = 'teacher'
        and not own_teacher.is_archived
    )
  order by t.cognome, t.nome, t.id;
$$;

revoke all on function public.active_teacher_directory() from public, anon, authenticated;
grant execute on function public.active_teacher_directory() to authenticated;
