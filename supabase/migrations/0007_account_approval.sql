-- ============================================================
-- AutiVision — Account Approval System
-- ============================================================
-- * Adds account_status: 'pending' | 'approved' | 'rejected'
-- * Adds assigned_doctor_id for staff accounts
-- * Updates trigger: new users start as 'pending'
-- * Existing users (pre-migration) are auto-approved
-- ============================================================

-- 1. Add account_status column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending'
    CHECK (account_status IN ('pending', 'approved', 'rejected'));

-- 2. Add assigned_doctor_id for staff
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_doctor_id uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Auto-approve all pre-existing users (they were already in the system)
UPDATE public.profiles
SET account_status = 'approved'
WHERE account_status = 'pending';

-- 4. Update trigger: new signups start as 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, locale, account_status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    NULL,
    'en',
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 5. Index for fast admin queries filtering by status
CREATE INDEX IF NOT EXISTS profiles_account_status_idx ON public.profiles (account_status);

-- 6. Index for assigned_doctor lookup
CREATE INDEX IF NOT EXISTS profiles_assigned_doctor_idx ON public.profiles (assigned_doctor_id);
