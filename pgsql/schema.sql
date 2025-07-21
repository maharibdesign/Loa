-- Life of Aviation TMA Schema - v1.1

-- Enable UUID generation
create extension if not exists "uuid-ossp" with schema "extensions";

-- 1. USERS TABLE
-- Stores user registration data and status.
create table public.users (
    id uuid default extensions.uuid_generate_v4() not null primary key,
    telegram_id bigint not null unique,
    full_name text not null,
    age integer not null,
    grade text not null,
    phone text not null,
    email text not null,
    receipt_url text not null,
    status text default 'Pending Approval'::text not null, -- 'Pending Approval', 'Active', 'Paused', 'Rejected'
    language_pref text default 'en'::text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);
comment on table public.users is 'Stores student registration information and subscription status.';

-- 2. MATERIALS TABLE
-- Stores links and data for course materials.
create table public.materials (
    id uuid default extensions.uuid_generate_v4() not null primary key,
    title text not null,
    description text,
    file_url text not null,
    file_name text, -- To store the original name of the uploaded file
    created_at timestamp with time zone default now() not null
);
comment on table public.materials is 'Course materials like PDFs and video links.';

-- 3. ANNOUNCEMENTS TABLE
-- Stores announcements sent by admins.
create table public.announcements (
    id uuid default extensions.uuid_generate_v4() not null primary key,
    content text not null,
    created_at timestamp with time zone default now() not null
);
comment on table public.announcements is 'Admin-pushed announcements for active users.';

-- 4. STORAGE BUCKETS
-- This SQL will attempt to create the buckets. If it fails due to permissions,
-- you MUST create them manually in the Supabase Dashboard.
-- Bucket 1: 'payment_receipts' (public: false)
-- Bucket 2: 'course_materials' (public: false)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('payment_receipts', 'payment_receipts', false, 5242880, '{"image/jpeg","image/png","image/webp"}'),
  ('course_materials', 'course_materials', false, 52428800, '{"application/pdf","video/mp4","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}')
on conflict (id) do nothing;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- This is the most critical part for security.

-- USERS table RLS
alter table public.users enable row level security;
drop policy if exists "Admins can manage all users." on public.users;
drop policy if exists "Users can view and update their own data." on public.users;
create policy "Admins can manage all users." on public.users for all using ( (select auth.role()) = 'service_role' );
-- We will create a function to get the telegram_id from the JWT to make policies cleaner.
create or replace function get_telegram_id_from_jwt()
returns bigint
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::bigint;
$$;
create policy "Users can view and update their own data." on public.users for all using ( telegram_id = get_telegram_id_from_jwt() );

-- MATERIALS table RLS
alter table public.materials enable row level security;
drop policy if exists "Admins can manage all materials." on public.materials;
drop policy if exists "Active users can view materials." on public.materials;
create policy "Admins can manage all materials." on public.materials for all using ( (select auth.role()) = 'service_role' );
create policy "Active users can view materials." on public.materials for select using (
  exists (
    select 1 from public.users
    where
      users.telegram_id = get_telegram_id_from_jwt()
      and users.status = 'Active'
  )
);

-- ANNOUNCEMENTS table RLS
alter table public.announcements enable row level security;
drop policy if exists "Admins can manage announcements." on public.announcements;
drop policy if exists "Authenticated users can read announcements." on public.announcements;
create policy "Admins can manage announcements." on public.announcements for all using ( (select auth.role()) = 'service_role' );
create policy "Authenticated users can read announcements." on public.announcements for select using ( auth.role() = 'authenticated' );

-- STORAGE policies for 'payment_receipts'
drop policy if exists "User can upload own receipt" on storage.objects;
create policy "User can upload own receipt" on storage.objects for insert with check ( bucket_id = 'payment_receipts' and owner = auth.uid() );
drop policy if exists "User can view own receipt" on storage.objects;
create policy "User can view own receipt" on storage.objects for select using ( bucket_id = 'payment_receipts' and owner = auth.uid() );
drop policy if exists "Admins can access all receipts." on storage.objects;
create policy "Admins can access all receipts." on storage.objects for all using ( bucket_id = 'payment_receipts' and (select auth.role()) = 'service_role' );

-- STORAGE policies for 'course_materials'
drop policy if exists "Admins can manage all materials files." on storage.objects;
create policy "Admins can manage all materials files." on storage.objects for all using ( bucket_id = 'course_materials' and (select auth.role()) = 'service_role' );
drop policy if exists "Active users can download materials." on storage.objects;
create policy "Active users can download materials." on storage.objects for select using (
  bucket_id = 'course_materials' AND
  exists (
    select 1 from public.users
    where
      users.telegram_id = get_telegram_id_from_jwt()
      and users.status = 'Active'
  )
);