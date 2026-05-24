-- ============================================================
-- AutiVision — Role refactor: doctor / secretary
-- ============================================================
-- * Adds 'doctor' and 'secretary' to role_enum
-- * Makes profiles.role nullable (NULL = role not yet chosen)
-- * Migrates legacy MEDECIN/PSYCHOLOGUE/ORTHOPHONISTE/ADMINISTRATEUR → 'doctor'
-- * Updates auto-profile trigger to create with role = NULL
--   so new users are redirected to the role-selection page after first login
-- ============================================================

-- 1. Extend the enum (idempotent)
ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'secretary';

-- 2. Make the column nullable and remove the NOT NULL constraint
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;

-- 3. Change default to NULL so new auto-created profiles require role selection
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT NULL;

-- 4. Migrate existing profiles: legacy roles → 'doctor'
UPDATE public.profiles
SET role = 'doctor'
WHERE role IN ('MEDECIN', 'PSYCHOLOGUE', 'ORTHOPHONISTE', 'ADMINISTRATEUR');

-- 5. Update trigger: new signups start with role = NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, locale)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    NULL,
    'en'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
