create table if not exists public.trees (
  id text primary key,
  canonical_key text not null unique,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  constraint trees_id_length check (char_length(id) between 1 and 64),
  constraint trees_data_size check (pg_column_size(data) <= 262144)
);

alter table public.trees enable row level security;

create policy "Anyone can view trees"
  on public.trees for select
  to anon, authenticated
  using (true);

create policy "Anyone can create trees"
  on public.trees for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update trees"
  on public.trees for update
  to anon, authenticated
  using (true)
  with check (true);
