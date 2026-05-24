-- Add email_verified flag to profiles.
-- This mirrors auth.users.email_confirmed_at but is queryable from the client
-- (client cannot read auth.users directly). The flag is set by the auth callback
-- route after a successful email confirmation code exchange.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Back-fill: any profile whose auth user already has email_confirmed_at set
-- should be marked verified. Requires service-role access; run via the
-- Supabase dashboard SQL editor or a migration runner that has access to auth schema.
UPDATE public.profiles p
SET email_verified = true
WHERE EXISTS (
  SELECT 1
  FROM auth.users u
  WHERE u.id = p.id
    AND u.email_confirmed_at IS NOT NULL
);
