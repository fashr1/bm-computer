-- =====================================================================
-- Order flow: shipping + cancellation + payment tracking + atomic stock
-- (จัดส่ง/ยกเลิก/ขอยกเลิก/คืนเงิน + ตัด-คืนสต็อกตอนจ่าย/ยกเลิก)
-- idempotent: รันซ้ำได้ปลอดภัย
-- =====================================================================

alter table public.orders add column if not exists tracking_no text;
alter table public.orders add column if not exists courier text;
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists canceled_at timestamptz;
alter table public.orders add column if not exists stock_deducted boolean not null default false;

-- เจ้าของอัปเดตออเดอร์ของตัวเองได้ (ใช้ยกเลิก/ขอยกเลิก) - defense-in-depth
-- (ในโหมด API เบราว์เซอร์ไม่มี token ตรง เขียนจริงผ่าน backend ที่คุม transition)
drop policy if exists "own orders update" on public.orders;
create policy "own orders update" on public.orders for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ปรับสต็อกของออเดอร์แบบ atomic (dir=-1 ตัดตอนจ่าย, +1 คืนตอนยกเลิก/คืนเงิน)
-- เรียกได้เฉพาะ service_role (verify-slip) หรือแอดมิน (จัดการออเดอร์) - กันผู้ใช้ทั่วไปยิงตรง
create or replace function public.adjust_order_stock(p_order uuid, p_dir int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.products p
  set stock = greatest(0, p.stock + p_dir * oi.qty)
  from public.order_items oi
  where oi.order_id = p_order and oi.product_id = p.id;
end; $$;
revoke all on function public.adjust_order_stock(uuid, int) from public, anon;
grant execute on function public.adjust_order_stock(uuid, int) to authenticated, service_role;
