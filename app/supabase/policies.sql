-- app/supabase/policies.sql

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

create policy "places_insert_authenticated" on public.places
  for insert with check (auth.uid() is not null and auth.uid() = created_by);

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
  -- Curated catalog entries (seeded via app/supabase/seed.sql, source='curated')
  -- are an operator/curation action, not an end-user submission, and have no
  -- created_by — exempt them from the daily quota entirely rather than
  -- requiring a fake author. Without this, applying seed.sql fails outright
  -- (see Task 8), because every curated row has created_by = null.
  if tg_table_name = 'places' and new.source = 'curated' then
    return new;
  end if;

  if tg_table_name = 'places' then
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
