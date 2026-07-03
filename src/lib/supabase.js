import { createClient } from '@supabase/supabase-js'
import { apiEnabled } from './apiClient'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// ถ้ายังไม่ใส่ key เว็บยังรันได้ (ใช้ mock) - เช็คด้วย flag นี้
export const isSupabaseConfigured = Boolean(url && anon)

// โหมด backend API: session จริงอยู่ใน HttpOnly cookie (worker) - client Supabase มีหน้าที่แค่
// เป็นทางผ่าน OAuth (Google) เท่านั้น จึงห้าม persist/refresh session ฝั่ง client
// หมายเหตุ: ห้ามใช้ supabase.auth.signOut() ล้าง session ที่โอนแล้ว - แม้ scope:'local'
// ก็ยังยิง POST /logout ไป revoke session ปัจจุบันที่ Supabase (= session เดียวกับใน cookie)
export const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: apiEnabled
        ? { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true }
        : { persistSession: true, autoRefreshToken: true },
    })
  : null

// ล้าง session เก่าที่บันเดิลเวอร์ชันก่อนเคย persist ไว้ (ตอนนี้ persistSession:false แล้ว)
if (isSupabaseConfigured && apiEnabled) {
  try { localStorage.removeItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`) } catch { /* ignore */ }
}
