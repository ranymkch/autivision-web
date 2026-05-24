-- ============================================================
-- AutiVision — public bucket for patient avatar photos
-- ============================================================
-- Patient avatars are display-only, not clinical screening data,
-- so they live in a public bucket separate from `facial-images`.
-- Owner-only write; world-readable.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', true)
on conflict (id) do update set public = true;

-- Read: anyone (bucket is public)
drop policy if exists "patient_photos_read" on storage.objects;
create policy "patient_photos_read" on storage.objects
  for select
  using (bucket_id = 'patient-photos');

-- Write/update/delete: owner-scoped (path starts with uid)
drop policy if exists "patient_photos_owner_write" on storage.objects;
create policy "patient_photos_owner_write" on storage.objects
  for insert
  with check (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "patient_photos_owner_update" on storage.objects;
create policy "patient_photos_owner_update" on storage.objects
  for update
  using (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "patient_photos_owner_delete" on storage.objects;
create policy "patient_photos_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
