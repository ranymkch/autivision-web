-- ============================================================
-- AutiVision — Remove patients owned by admin-role profiles
-- ============================================================
-- Context: during early development the admin account temporarily
-- had role 'doctor' (migration 0006 mapped all legacy roles to
-- 'doctor'). Patients created during that window have
-- owner_id = admin_uid. Because the admin profile is never
-- deleted, those patients survive doctor cleanup operations.
-- This migration deletes them. The ON DELETE CASCADE on
-- patients → evaluations → reports / questionnaires / facial_images
-- handles all child rows automatically.
-- ============================================================

DELETE FROM public.patients
WHERE owner_id IN (
  SELECT id FROM public.profiles WHERE role = 'admin'
);
