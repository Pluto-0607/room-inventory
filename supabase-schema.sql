create table if not exists public.containers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text default '容器',
  location text not null,
  note text default '',
  updated_at date default current_date
);

create table if not exists public.items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text default '未分类',
  container_id text references public.containers(id) on delete set null,
  location text not null,
  state text default '保留',
  note text default '',
  updated_at date default current_date
);

alter table public.containers add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.items add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.containers enable row level security;
alter table public.items enable row level security;

drop policy if exists "public containers read" on public.containers;
drop policy if exists "public containers insert" on public.containers;
drop policy if exists "public containers update" on public.containers;
drop policy if exists "public containers delete" on public.containers;
drop policy if exists "own containers read" on public.containers;
drop policy if exists "own containers insert" on public.containers;
drop policy if exists "own containers update" on public.containers;
drop policy if exists "own containers delete" on public.containers;

drop policy if exists "public items read" on public.items;
drop policy if exists "public items insert" on public.items;
drop policy if exists "public items update" on public.items;
drop policy if exists "public items delete" on public.items;
drop policy if exists "own items read" on public.items;
drop policy if exists "own items insert" on public.items;
drop policy if exists "own items update" on public.items;
drop policy if exists "own items delete" on public.items;

create policy "own containers read"
on public.containers for select
to authenticated
using (auth.uid() = user_id);

create policy "own containers insert"
on public.containers for insert
to authenticated
with check (auth.uid() = user_id);

create policy "own containers update"
on public.containers for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own containers delete"
on public.containers for delete
to authenticated
using (auth.uid() = user_id);

create policy "own items read"
on public.items for select
to authenticated
using (auth.uid() = user_id);

create policy "own items insert"
on public.items for insert
to authenticated
with check (auth.uid() = user_id);

create policy "own items update"
on public.items for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own items delete"
on public.items for delete
to authenticated
using (auth.uid() = user_id);
