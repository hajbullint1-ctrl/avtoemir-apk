-- Registration requests for new students
-- Safe to re-run

create table if not exists public.registration_requests (
  id text primary key,
  full_name text not null,
  phone text not null,
  category text,
  branch text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  note text
);

alter table public.registration_requests enable row level security;

drop policy if exists "reg_req_select_all" on public.registration_requests;
create policy "reg_req_select_all" on public.registration_requests
  for select to anon, authenticated using (true);

drop policy if exists "reg_req_insert_all" on public.registration_requests;
create policy "reg_req_insert_all" on public.registration_requests
  for insert to anon, authenticated with check (true);

drop policy if exists "reg_req_update_all" on public.registration_requests;
create policy "reg_req_update_all" on public.registration_requests
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "reg_req_delete_all" on public.registration_requests;
create policy "reg_req_delete_all" on public.registration_requests
  for delete to anon, authenticated using (true);

create index if not exists registration_requests_status_idx
  on public.registration_requests (status, created_at desc);
