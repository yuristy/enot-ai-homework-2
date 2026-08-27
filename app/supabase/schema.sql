-- app/supabase/schema.sql

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
  lat double precision not null,
  lng double precision not null,
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
  comment text,
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.routes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  start_lat double precision not null,
  start_lng double precision not null,
  place_ids bigint[] not null,
  created_at timestamptz not null default now()
);

create table public.moodboards (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  place_ids bigint[] not null,
  created_at timestamptz not null default now()
);
