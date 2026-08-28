-- app/supabase/policies.sql
--
-- Re-applying to a project that already has these policies: `create policy` fails
-- with "already exists", so run
--   drop policy if exists "places_insert_authenticated" on public.places;
-- (and the same for any other policy being replaced) before pasting this file,
-- or run just the changed statements. `create or replace function` and the
-- trigger definitions can be re-run only after the matching
--   drop trigger if exists places_rate_limit on public.places;
--   drop trigger if exists requests_rate_limit on public.requests;
-- the function body itself replaces in place without a drop.

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.favorites enable row level security;
alter table public.requests enable row level security;
alter table public.routes enable row level security;
alter table public.moodboards enable row level security;

-- profiles: only the owner, and only a real (non-anonymous) account may have one
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own_registered" on public.profiles
  for insert
  with check (
    auth.uid() = id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- places: readable by everyone, insertable by any authenticated session (rate-limited below)
create policy "places_select_all" on public.places
  for select using (true);

-- `source = 'user'` is part of the check on purpose: a client session (anonymous or
-- registered) may only ever create user-sourced rows. Curated rows are an operator
-- action applied through the SQL Editor (no JWT), never through PostgREST. Without
-- this clause a logged-in client could POST {"source":"curated","created_by":"<own-uid>"}
-- from DevTools and hit the trigger's curated exemption, bypassing the daily quota
-- entirely — see the matching `auth.uid() is null` guard in enforce_daily_limit() below.
-- (There is deliberately no UPDATE policy on places, so a row cannot be flipped to
-- 'curated' after the fact either — RLS denies by default.)
create policy "places_insert_authenticated" on public.places
  for insert with check (
    auth.uid() is not null and auth.uid() = created_by and source = 'user'
  );

-- Retrofitted live (see header note): lets the session that added a
-- user-sourced place remove it again. Scoped to source = 'user' so a
-- curated row can never be deleted through PostgREST even if created_by
-- somehow matched (it never does — curated rows have created_by = null).
create policy "places_delete_own" on public.places
  for delete using (auth.uid() = created_by and source = 'user');

-- requests: readable by everyone, insertable by any authenticated session (rate-limited below)
create policy "requests_select_all" on public.requests
  for select using (true);

create policy "requests_insert_authenticated" on public.requests
  for insert with check (auth.uid() is not null and auth.uid() = author_id);

-- favorites / routes / moodboards: owner-only, registered accounts only
create policy "favorites_own_registered" on public.favorites
  for all
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "routes_own_registered" on public.routes
  for all
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "moodboards_own_registered" on public.moodboards
  for all
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- daily rate limit: 1/day for anonymous sessions, 5/day for registered accounts,
-- applied to both `places` and `requests` inserts
create or replace function public.enforce_daily_limit()
returns trigger
language plpgsql
as $$
declare
  is_anon boolean;
  daily_limit integer;
  today_count integer;
  author uuid;
begin
  -- `new` is a generic RECORD here (this one function is attached to two
  -- tables with different columns), so `new.source` must never appear in the
  -- same boolean expression that also runs for the `requests` trigger — even
  -- guarded by `tg_table_name = 'places' and ...` short-circuiting, Postgres
  -- still tries to resolve `new.source` against whatever row actually fired
  -- the trigger and throws `42703 record "new" has no field "source"` for
  -- every `requests` insert. Nesting it inside its own `if tg_table_name =
  -- 'places' then` block (a separate PL/pgSQL statement, not a combined
  -- expression) keeps that branch from ever being reached for `requests` rows.
  --
  -- Curated catalog entries (seeded via app/supabase/seed.sql, source='curated')
  -- are an operator/curation action, not an end-user submission, and have no
  -- created_by — exempt them from the daily quota entirely rather than
  -- requiring a fake author. Without this, applying seed.sql fails outright
  -- (see Task 8), because every curated row has created_by = null.
  --
  -- The `auth.uid() is null` guard scopes the exemption to inserts that carry no
  -- JWT at all — i.e. the SQL Editor / postgres role, which is exactly how seeding
  -- happens. Anything arriving through PostgREST has a session (anonymous or
  -- registered) and therefore a non-null auth.uid(), so a client cannot buy its way
  -- out of the quota by claiming source='curated'. (RLS already rejects such an
  -- insert first — see places_insert_authenticated — this is the second lock.)
  if tg_table_name = 'places' then
    if new.source = 'curated' and auth.uid() is null then
      return new;
    end if;
    author := new.created_by;
  else
    author := new.author_id;
  end if;

  if author is null then
    raise exception 'rate_limit_missing_author' using errcode = 'P0001';
  end if;

  is_anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  daily_limit := case when is_anon then 1 else 5 end;

  if tg_table_name = 'places' then
    select count(*) into today_count
    from public.places
    where created_by = author
      and created_at >= date_trunc('day', now());
  else
    select count(*) into today_count
    from public.requests
    where author_id = author
      and created_at >= date_trunc('day', now());
  end if;

  if today_count >= daily_limit then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger places_rate_limit
  before insert on public.places
  for each row execute function public.enforce_daily_limit();

create trigger requests_rate_limit
  before insert on public.requests
  for each row execute function public.enforce_daily_limit();
