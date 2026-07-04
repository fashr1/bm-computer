-- =====================================================================
-- Community builds: ชื่อผู้สร้างบนแถว build (โชว์หน้าชุมชน) + index สเปคสาธารณะ
-- (เก็บ author_name บนแถวเหมือน reviews - ไม่เปิด profiles สาธารณะ)
-- =====================================================================

alter table public.builds add column if not exists author_name text;
create index if not exists idx_builds_public on public.builds(is_public, updated_at desc) where is_public;
