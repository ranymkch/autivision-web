-- ============================================================
-- AutiVision — typed reports + structured content
-- ============================================================
-- Adds report_type and a JSON content column so we can persist the
-- structured report produced by services/reportGenerator.ts.
-- One evaluation can have at most one report of each type
-- ('face' or 'combined') — both can coexist.
-- ============================================================

-- 1. add columns
alter table public.reports
  add column if not exists report_type text not null default 'face'
    check (report_type in ('face', 'combined'));

alter table public.reports
  add column if not exists content jsonb;

-- 2. drop the old per-evaluation uniqueness (introduced in 0001) so that
--    a single evaluation can hold both a face-only AND a combined report.
do $$
declare
  conname text;
begin
  for conname in
    select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
     where t.relname = 'reports'
       and c.contype = 'u'
  loop
    execute format('alter table public.reports drop constraint %I', conname);
  end loop;
end $$;

-- 3. enforce: one report per (evaluation, type)
create unique index if not exists reports_eval_type_unique
  on public.reports (evaluation_id, report_type);

-- 4. one questionnaire per evaluation (allows upsert from AQ-10 submission)
create unique index if not exists questionnaires_eval_unique
  on public.questionnaires (evaluation_id);
