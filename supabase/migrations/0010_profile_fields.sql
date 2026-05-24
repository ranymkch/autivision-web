-- Migration 0010: Add prenom, nom, numero_serie to profiles
-- prenom = first name, nom = last name, numero_serie = doctor license number

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prenom text,
  ADD COLUMN IF NOT EXISTS nom text,
  ADD COLUMN IF NOT EXISTS numero_serie text;

-- Backfill prenom / nom from existing full_name values
-- Split on first space: everything before → prenom, rest → nom
UPDATE profiles
SET
  prenom = CASE
    WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  nom = CASE
    WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
    THEN substr(full_name, position(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL AND prenom IS NULL;
