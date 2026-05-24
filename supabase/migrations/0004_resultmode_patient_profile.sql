-- ============================================================
-- AutiVision — result mode + patient identity (name & photo)
-- ============================================================
-- Adds:
--   * patients.name, patients.photo_url        (display-only fields)
--   * evaluations.result_mode                  ('ai'|'questionnaire'|'combined')
--   * extends reports.report_type to allow 'questionnaire'
-- ============================================================

-- 1. patient identity (display only — code_anonymise stays canonical)
alter table public.patients
  add column if not exists name text,
  add column if not exists photo_url text;

-- 2. evaluation result mode
alter table public.evaluations
  add column if not exists result_mode text
    check (result_mode in ('ai', 'questionnaire', 'combined'));

-- 3. allow 'questionnaire' as a report_type
do $$
declare
  conname text;
begin
  for conname in
    select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
     where t.relname = 'reports'
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%report_type%'
  loop
    execute format('alter table public.reports drop constraint %I', conname);
  end loop;
end $$;

alter table public.reports
  add constraint reports_report_type_check
  check (report_type in ('ai', 'face', 'questionnaire', 'combined'));
