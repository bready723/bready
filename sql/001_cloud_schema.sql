-- bready cloud schema -- run once in Supabase → SQL Editor.
--
-- Shapes mirror what the app already keeps in localStorage, so migration is a
-- straight copy. Three columns exist on every table for sync rather than for
-- the app itself:
--   user_id     who owns the row (row-level security keys off this)
--   updated_at  last-write-wins when two devices edited while offline
--   deleted_at  soft delete, so deleting on one device does not resurrect from
--               another that never heard about it
--
-- "id" is text, not uuid: the app already mints its own ids (storage.js uid())
-- and offline writes must get an id before they ever reach the server.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------- bakeries --
create table if not exists public.bakeries (
  id           text        not null,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  name         text        not null,
  area         text,
  city         text,
  tier         text,                       -- loved | fine | disliked
  score        numeric,
  rank_index   integer,                    -- position within its tier
  breads       jsonb       not null default '[]'::jsonb,
  other_label  text,
  photo_url    text,                       -- storage URL, never a data URL
  lat          double precision,
  lng          double precision,
  seeded       boolean     not null default false,
  last_visit   date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (user_id, id)
);

-- ------------------------------------------------------------------ visits --
create table if not exists public.visits (
  id              text        not null,
  user_id         uuid        not null references auth.users (id) on delete cascade,
  bakery_id       text        not null,
  visit_date      date        not null,
  breads          jsonb       not null default '[]'::jsonb,
  other_label     text,
  freshness_time  text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  primary key (user_id, id),
  foreign key (user_id, bakery_id) references public.bakeries (user_id, id) on delete cascade
);

-- ------------------------------------------------------------- want_to_try --
create table if not exists public.want_to_try (
  id          text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  area        text,
  city        text,
  photo_url   text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, id)
);

-- ------------------------------------------------------------------- notes --
create table if not exists public.notes (
  id          text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  text        text        not null,
  ts          bigint,                      -- the app's existing millisecond stamp
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, id)
);

-- ------------------------------------------------------------------- prefs --
create table if not exists public.prefs (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  country      text        not null default 'FR',
  fx_currency  text        not null default 'USD',
  updated_at   timestamptz not null default now()
);

-- Pulling "everything that changed since I last synced" is the hot path.
create index if not exists bakeries_sync_idx    on public.bakeries    (user_id, updated_at);
create index if not exists visits_sync_idx      on public.visits      (user_id, updated_at);
create index if not exists want_to_try_sync_idx on public.want_to_try (user_id, updated_at);
create index if not exists notes_sync_idx       on public.notes       (user_id, updated_at);

-- ----------------------------------------------------------------- security --
-- Without this, the publishable key would let anyone read every row. RLS is the
-- actual protection; the key is only an address.
alter table public.bakeries    enable row level security;
alter table public.visits      enable row level security;
alter table public.want_to_try enable row level security;
alter table public.notes       enable row level security;
alter table public.prefs       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bakeries', 'visits', 'want_to_try', 'notes', 'prefs'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- --------------------------------------------------------------- photo files --
-- Private bucket; each user may only touch files under a folder named with
-- their own user id.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists own_photos on storage.objects;
create policy own_photos on storage.objects for all to authenticated
  using      (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
