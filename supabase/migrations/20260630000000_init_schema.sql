-- =====================================================================
-- BM Computer - Database Schema (Supabase / PostgreSQL)
-- รันใน Supabase Dashboard → SQL Editor → New query → วางทั้งหมด → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- =====================================================================
-- 1) CATEGORIES
-- =====================================================================
create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name_th   text not null,
  name_en   text not null,
  icon      text,                       -- ชื่อไอคอน SVG (Icons.jsx)
  sort      int default 0,
  created_at timestamptz default now()
);

-- =====================================================================
-- 2) BRANDS
-- =====================================================================
create table if not exists public.brands (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name      text not null,
  logo_url  text,                       -- ภาพโลโก้แบรนด์แบบลิงก์ (admin วางได้)
  sort      int default 0,
  created_at timestamptz default now()
);

-- =====================================================================
-- 3) PRODUCTS
-- =====================================================================
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  brand_id     uuid references public.brands(id) on delete set null,
  category_id  uuid references public.categories(id) on delete set null,
  price        int not null,
  old_price    int,
  sale_price   int,                      -- ราคา Flash Sale (ถ้ามี)
  sale_ends_at timestamptz,              -- เวลาสิ้นสุด Flash Sale
  stock        int default 0,
  rating       numeric(2,1) default 5.0,
  reviews_count int default 0,
  badge        text,                     -- best | sale | low | null
  images       jsonb default '[]'::jsonb,-- อาเรย์ URL รูป (แบบลิงก์) สำหรับแกลเลอรี
  specs        jsonb default '{}'::jsonb,
  description  text,
  is_active    boolean default true,
  is_featured  boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_products_featured on public.products(is_featured) where is_featured;

-- =====================================================================
-- 4) SLIDES / BANNERS (จัดการ carousel + flash sale จากหลังบ้าน)
-- =====================================================================
create table if not exists public.slides (
  id         uuid primary key default gen_random_uuid(),
  placement  text not null default 'hero',   -- hero | promo | flashsale | brandbar
  title      text,
  image_url  text,                            -- รูปสไลด์แบบลิงก์
  link       text,                            -- กดแล้วไปที่ไหน
  sort       int default 0,
  is_active  boolean default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz default now()
);

-- =====================================================================
-- 5) PROFILES (ต่อจาก auth.users + role สำหรับ CRM/Admin)
-- =====================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  role       text not null default 'customer',  -- customer | admin
  created_at timestamptz default now()
);

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้สมัครใหม่ (ดึง full_name/phone จาก metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'phone', 'customer')
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- เช็คว่าเป็นแอดมินไหม (ใช้ใน RLS)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- =====================================================================
-- 6) ORDERS + ITEMS
-- =====================================================================
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  code        text unique default ('BM' || to_char(now(),'YYMM') || lpad((floor(random()*100000))::text,5,'0')),
  user_id     uuid references auth.users(id) on delete set null,
  total       int not null default 0,
  status      text not null default 'pending', -- pending|paid|packing|shipping|done|cancel
  payment_method text default 'promptpay',
  ship_name   text, ship_phone text, ship_address text,
  created_at  timestamptz default now()
);
create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text, price int not null, qty int not null default 1
);

-- =====================================================================
-- 7) REVIEWS
-- =====================================================================
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- =====================================================================
-- 8) SITE SETTINGS (เนื้อหา/ค่าตั้งต่างๆ ที่หลังบ้านแก้ได้)
-- =====================================================================
create table if not exists public.site_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.categories    enable row level security;
alter table public.brands        enable row level security;
alter table public.products      enable row level security;
alter table public.slides        enable row level security;
alter table public.profiles      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.reviews       enable row level security;
alter table public.site_settings enable row level security;

-- อ่านสาธารณะ (catalog) - เขียนเฉพาะแอดมิน
do $$
declare t text;
begin
  foreach t in array array['categories','brands','products','slides','site_settings'] loop
    execute format('drop policy if exists "public read %1$s" on public.%1$s;', t);
    execute format('create policy "public read %1$s" on public.%1$s for select using (true);', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$s;', t);
    execute format('create policy "admin write %1$s" on public.%1$s for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- profiles: เจ้าของอ่าน/แก้ของตัวเอง, แอดมินเห็นทุกคน
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- orders: เจ้าของอ่าน/สร้างของตัวเอง, แอดมินจัดการทั้งหมด
drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "create own orders" on public.orders;
create policy "create own orders" on public.orders for insert with check (auth.uid() = user_id);
drop policy if exists "admin orders" on public.orders;
create policy "admin orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "own order items" on public.order_items;
create policy "own order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
drop policy if exists "insert order items" on public.order_items;
create policy "insert order items" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- reviews: อ่านสาธารณะ, ล็อกอินเขียนของตัวเอง
drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (true);
drop policy if exists "write own reviews" on public.reviews;
create policy "write own reviews" on public.reviews for insert with check (auth.uid() = user_id);

-- =====================================================================
-- เสร็จแล้ว → ไปรัน seed.sql ต่อ
-- หลังสมัครสมาชิกครั้งแรก ทำตัวเองเป็นแอดมิน:
--   update public.profiles set role='admin' where email='YOUR_EMAIL';
-- =====================================================================
