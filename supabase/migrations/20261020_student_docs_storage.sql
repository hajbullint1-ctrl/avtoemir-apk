-- Run once in Supabase SQL Editor so student documents can be downloaded by admin.

-- Student identity and medical documents (admin download)
insert into storage.buckets (id, name, public)
values ('student-docs', 'student-docs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "student_docs_public_read" on storage.objects;
create policy "student_docs_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'student-docs');

drop policy if exists "student_docs_insert" on storage.objects;
create policy "student_docs_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'student-docs');

drop policy if exists "student_docs_update" on storage.objects;
create policy "student_docs_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'student-docs');

drop policy if exists "student_docs_delete" on storage.objects;
create policy "student_docs_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'student-docs');
