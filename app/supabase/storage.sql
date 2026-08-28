-- app/supabase/storage.sql
--
-- Storage bucket for place photos attached through the add-place form.
-- Public bucket: photo URLs need to be viewable by anonymous visitors on the
-- public map (see PlacesMap.tsx), the same way the seeded Wikimedia Commons
-- URLs already are — there is no "private photo" concept in this app.
--
-- The bucket itself CANNOT be created by running the INSERT below through
-- the SQL Editor — found live: the statement reports "Success", but the row
-- never actually persists (storage.buckets is managed through Supabase's
-- Storage API, not plain SQL, unlike every other table in this project).
-- Create it through Dashboard → Storage → New bucket instead, with:
--   name: place-photos · Public bucket: ON
--   Restrict file size: ON, 5 MB · Restrict MIME types: ON, image/*
-- The INSERT is left here only as a record of the equivalent settings, and
-- because it's a genuine no-op (`on conflict do nothing`) if the bucket
-- already exists — not because it's a working alternative to the Dashboard.
--
-- The two RLS policies below, by contrast, are plain Postgres policies on
-- storage.objects and DO apply correctly through the SQL Editor.

insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

-- Any authenticated session (anonymous or registered — both carry a real
-- auth.uid()) may upload into this bucket. There is no owner-scoped path
-- enforcement here beyond the client naming files as `${user.id}/...`
-- (AddPlaceForm.tsx) — matching the same trust level already given to
-- inserting `places` rows, which this upload always accompanies.
create policy "place_photos_insert_authenticated"
  on storage.objects for insert
  to public
  with check (bucket_id = 'place-photos' and auth.uid() is not null);

-- Deliberately no SELECT policy: a public bucket (`public = true` above)
-- already serves any object by its known public URL without needing RLS —
-- that's what "public" means for Storage. A SELECT policy on
-- storage.objects instead governs *listing/enumerating* the bucket's
-- contents via the API, which this app never needs (only getPublicUrl() on
-- paths it already knows) and which Supabase's own dashboard flags as an
-- unnecessary exposure on a public bucket. Confirmed live: adding one and
-- then removing it made no difference to photo display.
