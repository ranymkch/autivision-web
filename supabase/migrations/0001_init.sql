-- ============================================================
-- Autivision — Initial Schema
-- Run in Supabase SQL editor or via `supabase db push`
-- ============================================================

-- Extensions ---------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums --------------------------------------------------------
do $$ begin
  create type role_enum   as enum ('MEDECIN','PSYCHOLOGUE','ORTHOPHONISTE','ADMINISTRATEUR');
exception when duplicate_object then null; end $$;

do $$ begin
  create type risque_enum as enum ('FAIBLE','MODERE','ELEVE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type statut_enum as enum ('EN_ATTENTE','EN_COURS','TERMINEE','VALIDEE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sexe_enum   as enum ('M','F','AUTRE');
exception when duplicate_object then null; end $$;

-- profiles -----------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        role_enum not null default 'MEDECIN',
  locale      text not null default 'en' check (locale in ('fr','en')),
  created_at  timestamptz not null default now()
);

-- patients -----------------------------------------------------
create table if not exists public.patients (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  code_anonymise  text not null unique,
  age             int  not null check (age >= 0 and age <= 30),
  sexe            sexe_enum not null,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists patients_owner_idx on public.patients(owner_id);

-- evaluations --------------------------------------------------
create table if not exists public.evaluations (
  id                   uuid primary key default uuid_generate_v4(),
  patient_id           uuid not null references public.patients(id) on delete cascade,
  owner_id             uuid not null references public.profiles(id) on delete cascade,
  statut               statut_enum not null default 'EN_ATTENTE',
  niveau_risque        risque_enum,
  score_global         numeric(5,4),
  score_image          numeric(5,4),
  score_questionnaire  numeric(5,4),
  ml_prediction        text,
  ml_confidence        numeric(6,4),
  ml_model             text,
  commentaires         text,
  date_evaluation      timestamptz not null default now(),
  created_at           timestamptz not null default now()
);
create index if not exists evaluations_patient_idx on public.evaluations(patient_id);
create index if not exists evaluations_owner_idx   on public.evaluations(owner_id);

-- facial_images ------------------------------------------------
create table if not exists public.facial_images (
  id             uuid primary key default uuid_generate_v4(),
  evaluation_id  uuid not null references public.evaluations(id) on delete cascade,
  storage_path   text not null,
  taille_octets  int not null,
  mime_type      text not null,
  created_at     timestamptz not null default now()
);

-- questionnaires -----------------------------------------------
create table if not exists public.questionnaires (
  id                 uuid primary key default uuid_generate_v4(),
  evaluation_id      uuid not null references public.evaluations(id) on delete cascade,
  type_questionnaire text not null default 'M-CHAT-R',
  reponses           jsonb not null,
  score              numeric(5,4) not null,
  created_at         timestamptz not null default now()
);

-- reports ------------------------------------------------------
create table if not exists public.reports (
  id              uuid primary key default uuid_generate_v4(),
  evaluation_id   uuid not null unique references public.evaluations(id) on delete cascade,
  storage_path    text,
  format_document text not null default 'PDF',
  valide          boolean not null default false,
  generated_at    timestamptz not null default now()
);

-- history ------------------------------------------------------
create table if not exists public.history (
  id             uuid primary key default uuid_generate_v4(),
  patient_id     uuid references public.patients(id) on delete set null,
  evaluation_id  uuid references public.evaluations(id) on delete set null,
  actor_id       uuid not null references public.profiles(id) on delete cascade,
  action         text not null,
  details        jsonb,
  created_at     timestamptz not null default now()
);

-- RLS ----------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.patients       enable row level security;
alter table public.evaluations    enable row level security;
alter table public.facial_images  enable row level security;
alter table public.questionnaires enable row level security;
alter table public.reports        enable row level security;
alter table public.history        enable row level security;

-- profiles: a user can read/update their own profile
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- generic owner_id-based policies
drop policy if exists "patients_owner_all" on public.patients;
create policy "patients_owner_all" on public.patients
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "evaluations_owner_all" on public.evaluations;
create policy "evaluations_owner_all" on public.evaluations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- nested tables: scoped via parent evaluation
drop policy if exists "facial_images_via_eval" on public.facial_images;
create policy "facial_images_via_eval" on public.facial_images
  for all using (
    exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid())
  );

drop policy if exists "questionnaires_via_eval" on public.questionnaires;
create policy "questionnaires_via_eval" on public.questionnaires
  for all using (
    exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid())
  );

drop policy if exists "reports_via_eval" on public.reports;
create policy "reports_via_eval" on public.reports
  for all using (
    exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid())
  );

drop policy if exists "history_actor_all" on public.history;
create policy "history_actor_all" on public.history
  for all using (auth.uid() = actor_id) with check (auth.uid() = actor_id);

-- Auto-create profile on user signup ---------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'MEDECIN',
    'en'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage buckets ----------------------------------------------
insert into storage.buckets (id, name, public)
values ('facial-images', 'facial-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Storage policies: users access only objects whose path begins with their UID
drop policy if exists "facial_images_owner" on storage.objects;
create policy "facial_images_owner" on storage.objects
  for all to authenticated using (
    bucket_id = 'facial-images' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'facial-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "reports_owner" on storage.objects;
create policy "reports_owner" on storage.objects
  for all to authenticated using (
    bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text
  );
