-- ============================================================
-- AutiVision — Fix report_type constraint + update TypeScript types
-- ============================================================
-- The original check constraint on reports.report_type only allowed
-- 'face' and 'combined'. The app now generates 'ai' and 'questionnaire'
-- reports too, which was causing silent DB upsert failures.
-- ============================================================

-- 1. Drop the old check constraint
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_check;

-- 2. Re-add with all valid types
ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check
    CHECK (report_type IN ('face', 'ai', 'questionnaire', 'combined'));

-- 3. Also add default that matches new naming
ALTER TABLE public.reports
  ALTER COLUMN report_type SET DEFAULT 'ai';

-- 4. Update any orphaned 'face' rows to 'ai' for consistency (both are equivalent)
-- (do NOT change — keep as 'face' for backwards compat, the code handles both)
