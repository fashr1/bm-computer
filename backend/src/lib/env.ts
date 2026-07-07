// ค่าแวดล้อม (bindings) ที่ Worker ได้รับ - ตั้งใน wrangler.toml [vars] และ secrets
export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  // ตัวเลือก: ต้องมีเฉพาะ verify-slip (อัปเดตออเดอร์ข้าม RLS) - ฟีเจอร์อื่นไม่ใช้
  SUPABASE_SERVICE_ROLE_KEY?: string
  TURNSTILE_SECRET?: string
  EASYSLIP_API_TOKEN?: string
  FRONTEND_ORIGIN: string
  ACCESS_TTL: string
  REFRESH_TTL: string
  // หน้าต่าง idle ของ session เมื่อ "ไม่ติ๊กจดจำฉัน" (วินาที) - เลื่อนออกทุกครั้งที่ refresh
  IDLE_TTL?: string
  COOKIE_SAMESITE: string
  COOKIE_SECURE: string
}

// ตัวตนผู้ใช้ที่ผ่านการยืนยันแล้ว (แนบไว้ใน context หลังผ่าน middleware)
export type AuthUser = {
  id: string
  email: string | null
  role: string // customer | admin
}

// ประเภท context variables ของ Hono
export type Variables = {
  user: AuthUser
  token: string // access token ของ user (ใช้สร้าง client แบบ RLS-scoped)
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }

export const num = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}
