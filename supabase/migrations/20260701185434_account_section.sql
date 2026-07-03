-- =====================================================================
-- BM Computer - Migration 0001: Account section
-- ขยาย profiles + ตารางบัญชี (addresses, tax_profiles, payment_methods, wishlist)
-- ปลอดภัย: additive ล้วน (IF NOT EXISTS) รันซ้ำได้ ไม่กระทบข้อมูลเดิม
-- =====================================================================

-- ---------- 1) ขยาย profiles: วันเกิด / LINE / Facebook / รูป ----------
alter table public.profiles add column if not exists birthdate  date;
alter table public.profiles add column if not exists line_id    text;
alter table public.profiles add column if not exists facebook   text;
alter table public.profiles add column if not exists avatar_url text;

-- ---------- 2) ADDRESSES (ที่อยู่สำหรับจัดส่ง) ----------
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text,                       -- บ้าน / ที่ทำงาน ...
  recipient  text not null,              -- ชื่อผู้รับ
  phone      text not null,
  line1      text not null,              -- บ้านเลขที่/ถนน/อาคาร
  district   text,                       -- ตำบล/แขวง
  amphoe     text,                       -- อำเภอ/เขต
  province   text,
  postcode   text,
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_addresses_user on public.addresses(user_id);

-- ---------- 3) TAX PROFILES (ที่อยู่ออกใบกำกับภาษี) ----------
create table if not exists public.tax_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null default 'personal',  -- personal | company
  name        text not null,                       -- ชื่อบุคคล/นิติบุคคล
  tax_id      text not null,                       -- เลขประจำตัวผู้เสียภาษี 13 หลัก
  branch      text,                                -- สาขา (นิติบุคคล) เช่น สำนักงานใหญ่
  phone       text,
  address     text not null,
  is_default  boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_tax_user on public.tax_profiles(user_id);

-- ---------- 4) PAYMENT METHODS (ช่องทางชำระเงินที่บันทึกไว้) ----------
-- เก็บเฉพาะข้อมูลไม่อ่อนไหว (ห้ามเก็บเลขบัตร/CVV) - เป็นค่าตั้งต้นสะดวกตอน checkout
create table if not exists public.payment_methods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null,            -- promptpay | bank_transfer | cod | card
  label        text,                     -- ชื่อเรียกที่ผู้ใช้ตั้ง
  provider     text,                     -- ชื่อธนาคาร / brand บัตร
  account_name text,                     -- ชื่อบัญชี/ชื่อบนบัตร
  masked       text,                     -- เลขบางส่วนแบบปิดบัง เช่น xxxx-1234
  is_default   boolean not null default false,
  created_at   timestamptz default now()
);
create index if not exists idx_pay_user on public.payment_methods(user_id);

-- ---------- 5) WISHLIST (สินค้าที่ถูกใจ) ----------
create table if not exists public.wishlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);
create index if not exists idx_wishlist_user on public.wishlist(user_id);

-- ---------- updated_at triggers ----------
drop trigger if exists trg_addresses_updated on public.addresses;
create trigger trg_addresses_updated before update on public.addresses
  for each row execute function public.set_updated_at();
drop trigger if exists trg_tax_updated on public.tax_profiles;
create trigger trg_tax_updated before update on public.tax_profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY (defense-in-depth: backend ใช้ service_role แต่กันการเข้าถึงตรงจาก client)
-- เจ้าของจัดการเฉพาะแถวของตัวเอง + แอดมินดูได้ทั้งหมด
-- =====================================================================
alter table public.addresses       enable row level security;
alter table public.tax_profiles    enable row level security;
alter table public.payment_methods enable row level security;
alter table public.wishlist        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['addresses','tax_profiles','payment_methods','wishlist'] loop
    execute format('drop policy if exists "own rows read %1$s" on public.%1$s;', t);
    execute format('create policy "own rows read %1$s" on public.%1$s for select using (auth.uid() = user_id or public.is_admin());', t);
    execute format('drop policy if exists "own rows write %1$s" on public.%1$s;', t);
    execute format('create policy "own rows write %1$s" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
