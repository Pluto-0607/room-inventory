create table if not exists public.containers (
  id text primary key,
  name text not null,
  type text default '容器',
  location text not null,
  note text default '',
  updated_at date default current_date
);

create table if not exists public.items (
  id text primary key,
  name text not null,
  category text default '未分类',
  container_id text references public.containers(id) on delete set null,
  location text not null,
  state text default '保留',
  note text default '',
  updated_at date default current_date
);

alter table public.containers enable row level security;
alter table public.items enable row level security;

drop policy if exists "public containers read" on public.containers;
drop policy if exists "public containers insert" on public.containers;
drop policy if exists "public containers update" on public.containers;
drop policy if exists "public containers delete" on public.containers;

drop policy if exists "public items read" on public.items;
drop policy if exists "public items insert" on public.items;
drop policy if exists "public items update" on public.items;
drop policy if exists "public items delete" on public.items;

create policy "public containers read"
on public.containers for select
to anon
using (true);

create policy "public containers insert"
on public.containers for insert
to anon
with check (true);

create policy "public containers update"
on public.containers for update
to anon
using (true)
with check (true);

create policy "public containers delete"
on public.containers for delete
to anon
using (true);

create policy "public items read"
on public.items for select
to anon
using (true);

create policy "public items insert"
on public.items for insert
to anon
with check (true);

create policy "public items update"
on public.items for update
to anon
using (true)
with check (true);

create policy "public items delete"
on public.items for delete
to anon
using (true);
