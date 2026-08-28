-- app/supabase/schema.sql
--
-- The CHECK constraints on places.lat/lng, requests.comment, and
-- routes/moodboards.place_ids were added after the live project's tables
-- already existed (found by an agent-breaker session: client-side
-- validation alone was bypassable via a direct curl POST with a valid
-- session token). A fresh `create table` run picks them up automatically;
-- an already-existing project needs the equivalent `alter table ... add
-- constraint` statements instead (applied once, directly, not stored here).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('seeker', 'photographer')),
  display_name text,
  created_at timestamptz not null default now()
);

create table public.places (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  lat double precision not null check (lat >= -90 and lat <= 90),
  lng double precision not null check (lng >= -180 and lng <= 180),
  tags text[] not null default '{}',
  photo_url text,
  source text not null check (source in ('curated', 'user')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id bigint not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.requests (
  id bigint generated always as identity primary key,
  request_type text not null check (request_type in ('seeking_photographer', 'offering_photography')),
  place_id bigint references public.places(id),
  wanted_date date,
  comment text check (comment is not null and btrim(comment) <> '' and char_length(comment) <= 2000),
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.routes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  start_lat double precision not null,
  start_lng double precision not null,
  place_ids bigint[] not null check (cardinality(place_ids) > 0),
  created_at timestamptz not null default now()
);

create table public.moodboards (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  place_ids bigint[] not null check (cardinality(place_ids) > 0),
  created_at timestamptz not null default now()
);
