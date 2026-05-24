-- ============================================================
-- AutiVision — image-only screening
-- ============================================================
-- The screening flow no longer collects a behavioural questionnaire,
-- so the related score is now optional. The questionnaires table is
-- kept for compatibility / future re-introduction but no rows will
-- be inserted from the new flow.
-- ============================================================

alter table public.evaluations
  alter column score_questionnaire drop not null;

-- (already nullable in 0001 — this is a no-op safeguard.)
alter table public.evaluations
  alter column score_image drop not null;
