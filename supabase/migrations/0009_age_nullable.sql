-- Make age optional on patients (field is now collected but not mandatory)
alter table public.patients
  alter column age drop not null;

-- Update check to allow null (null satisfies check by SQL rules, but be explicit)
alter table public.patients
  drop constraint if exists patients_age_check;

alter table public.patients
  add constraint patients_age_check check (age is null or (age >= 0 and age <= 30));
