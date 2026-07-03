-- =====================================================================
-- BM Computer - Reviews system: ให้รีวิวจริงเขียน/อ่านจาก DB
-- - 1 user รีวิวได้ 1 ครั้งต่อสินค้า (แก้ทับได้)
-- - เก็บชื่อผู้รีวิว (author_name) บนแถว - ไม่เปิด profiles ให้อ่านสาธารณะ
-- - verified = เคยซื้อสินค้านี้จริง (เช็คตอนเขียนผ่าน backend)
-- - trigger คำนวณ products.rating / reviews_count ใหม่อัตโนมัติ
-- =====================================================================

alter table public.reviews add column if not exists author_name text;
alter table public.reviews add column if not exists verified boolean not null default false;
alter table public.reviews add column if not exists updated_at timestamptz default now();

create unique index if not exists reviews_user_product_uniq
  on public.reviews (product_id, user_id);

-- แก้/ลบได้เฉพาะรีวิวของตัวเอง
drop policy if exists "update own reviews" on public.reviews;
create policy "update own reviews" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own reviews" on public.reviews;
create policy "delete own reviews" on public.reviews
  for delete using (auth.uid() = user_id);

-- updated_at อัตโนมัติ (ฟังก์ชัน set_updated_at มีอยู่แล้วจาก schema หลัก)
drop trigger if exists trg_reviews_updated on public.reviews;
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

-- คำนวณคะแนนเฉลี่ย + จำนวนรีวิวของสินค้าใหม่ทุกครั้งที่รีวิวเปลี่ยน
-- security definer เพราะลูกค้าไม่มีสิทธิ์เขียนตาราง products เอง (RLS admin-only)
create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = pid), 5.0),
    reviews_count = (select count(*) from public.reviews r where r.product_id = pid)
  where p.id = pid;
  return null;
end $$;
drop trigger if exists trg_refresh_product_rating on public.reviews;
create trigger trg_refresh_product_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();
