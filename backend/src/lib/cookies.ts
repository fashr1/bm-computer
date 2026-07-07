import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { AppEnv } from './env'
import { num } from './env'

export const ACCESS_COOKIE = 'bm_at'
export const REFRESH_COOKIE = 'bm_rt'
// จำ "จดจำฉัน" ไว้ข้าง refresh cookie เพื่อให้ rotation รอบถัดไปต่ออายุด้วยหน้าต่างเดิม
export const REMEMBER_COOKIE = 'bm_rm'
// refresh cookie จำกัด path ไว้เฉพาะ endpoint auth (ลดพื้นที่เสี่ยงถูกส่งออกโดยไม่จำเป็น)
const REFRESH_PATH = '/api/auth'

type SameSite = 'Strict' | 'Lax' | 'None'

function baseOpts(c: Context<AppEnv>) {
  const sameSite = (c.env.COOKIE_SAMESITE || 'Lax') as SameSite
  const secure = String(c.env.COOKIE_SECURE) === 'true'
  return { httpOnly: true, secure, sameSite, path: '/' as string }
}

// ออกคุกกี้ session ทั้งคู่ - เรียกตอน login และ refresh (rotation)
// โมเดลอายุ session: access สั้น (15 นาที) ส่วน refresh เป็น "หน้าต่าง idle" แบบเลื่อนได้
//   - ไม่ติ๊กจดจำฉัน: IDLE_TTL (ค่าเริ่มต้น 1 ชม.) - ใช้งานอยู่ = ต่ออายุทุกรอบ refresh, ทิ้งไว้เฉยๆ = หลุด
//   - ติ๊กจดจำฉัน:   REFRESH_TTL (7 วัน)
export function setSessionCookies(c: Context<AppEnv>, accessToken: string, refreshToken: string, remember: boolean) {
  const opts = baseOpts(c)
  const refreshTtl = remember ? num(c.env.REFRESH_TTL, 604800) : num(c.env.IDLE_TTL, 3600)
  setCookie(c, ACCESS_COOKIE, accessToken, { ...opts, maxAge: num(c.env.ACCESS_TTL, 900) })
  setCookie(c, REFRESH_COOKIE, refreshToken, { ...opts, path: REFRESH_PATH, maxAge: refreshTtl })
  setCookie(c, REMEMBER_COOKIE, remember ? '1' : '0', { ...opts, path: REFRESH_PATH, maxAge: refreshTtl })
}

export function clearSessionCookies(c: Context<AppEnv>) {
  const opts = baseOpts(c)
  deleteCookie(c, ACCESS_COOKIE, { ...opts })
  deleteCookie(c, REFRESH_COOKIE, { ...opts, path: REFRESH_PATH })
  deleteCookie(c, REMEMBER_COOKIE, { ...opts, path: REFRESH_PATH })
}

export const getRemember = (c: Context<AppEnv>) => getCookie(c, REMEMBER_COOKIE) === '1'

export const getAccessToken = (c: Context<AppEnv>) => getCookie(c, ACCESS_COOKIE)
export const getRefreshToken = (c: Context<AppEnv>) => getCookie(c, REFRESH_COOKIE)
