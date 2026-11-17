-- One phone = one registration request / profile
-- Safe to re-run. Dedupes first, then adds UNIQUE.

-- Remove duplicate phones, keep the newest row
delete from public.registration_requests a
using public.registration_requests b
where a.phone = b.phone
  and a.created_at < b.created_at;

-- Also keep one if created_at is equal (by id)
delete from public.registration_requests a
using public.registration_requests b
where a.phone = b.phone
  and a.id < b.id;

-- Unique constraint
alter table public.registration_requests
  drop constraint if exists registration_requests_phone_key;

alter table public.registration_requests
  add constraint registration_requests_phone_key unique (phone);

-- Index for fast lookup by phone (last 10 digits often used)
create index if not exists registration_requests_phone_idx
  on public.registration_requests (phone);

-- Note: accounts and students live in app_state JSON arrays.
-- Uniqueness by phone is enforced in application logic (auth.ts + registration-requests.ts).
-- On full delete, also remove from app_state keys: accounts, students, regCredentials, registrationRequests.
