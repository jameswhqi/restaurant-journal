-- Run this in Supabase → SQL Editor

create table restaurants (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now() not null,
  name        text not null,
  city        text,
  cuisine     text,
  dine_type   text[] not null default '{}',
  env_rating  smallint not null default 0 check (env_rating between 0 and 3),
  svc_rating  smallint not null default 0 check (svc_rating between 0 and 3),
  dine_note   text,
  is_fav      boolean not null default false,
  visit_count smallint not null default 1
);

create table dishes (
  id             bigint generated always as identity primary key,
  restaurant_id  bigint not null references restaurants (id) on delete cascade,
  name           text not null,
  price          text,
  rating         smallint not null default 0 check (rating between -1 and 4),
  dtype          text not null default 'main' check (dtype in ('main', 'dessert', 'drink')),
  note           text
);

-- Row Level Security: only authenticated users can access their own data.
-- For a single-user personal app, the simplest approach is to enable RLS
-- and allow all operations for authenticated users only.

alter table restaurants enable row level security;
alter table dishes enable row level security;

create policy "Allow all for authenticated users" on restaurants
  for all using (auth.role() = 'authenticated');

create policy "Allow all for authenticated users" on dishes
  for all using (auth.role() = 'authenticated');
