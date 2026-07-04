import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { apiEnabled, refreshSession } from '../lib/apiClient'
import { authApi } from '../lib/accountApi'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// เพิ่งกลับมาจากหน้า Google OAuth หรือไม่ - ใช้โชว์ overlay "กำลังเข้าสู่ระบบ"
// เช็คจาก sessionStorage flag (ตั้งตอนกดปุ่ม Google ใน AuthForm) เพราะ supabase-js
// ลบ token ออกจาก URL hash ก่อน React mount ทำให้เช็คจาก hash ตรงๆ ไม่ทัน
export const OAUTH_FLAG = 'bm-oauth-return'
// โชว์ overlay อย่างน้อยเท่านี้ กันกระพริบแวบเดียวแล้วหาย (ดูไม่ออกว่าเกิดอะไรขึ้น)
const OAUTH_OVERLAY_MIN_MS = 900
function isOAuthReturn() {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(OAUTH_FLAG) === '1'
      || window.location.hash.includes('access_token=')
      || /[?&]code=/.test(window.location.search)
  } catch { return false }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [oauthPending, setOauthPending] = useState(isOAuthReturn)

  // โหลดผู้ใช้ปัจจุบันจาก backend (session อยู่ใน HttpOnly cookie)
  // /me ตอบ 200 เสมอ: user=null คือยังไม่ล็อกอิน · refreshable=true คือ access หมดอายุ
  // แต่ refresh cookie ยังอยู่ -> ต่ออายุแล้วถามซ้ำ (ก่อนหน้านี้เคสนี้กลายเป็น "โดนเด้งออกเงียบๆ")
  const reload = useCallback(async () => {
    if (!apiEnabled) return
    try {
      let { user: u, refreshable } = await authApi.me()
      if (!u && refreshable && (await refreshSession())) {
        ({ user: u } = await authApi.me())
      }
      setUser(u ? { id: u.id, email: u.email } : null)
      setProfile(u || null)
    } catch {
      setUser(null)
      setProfile(null)
    }
  }, [])

  // ===== โหมด backend API (session สั้น + HttpOnly cookie) =====
  useEffect(() => {
    if (!apiEnabled) return
    let alive = true
    ;(async () => {
      const wasOauth = isOAuthReturn()
      const started = Date.now()
      // ถ้ากลับมาจาก Google OAuth: supabase-js ฝั่ง client จะจับ session จาก URL hash
      // -> โอนเข้า HttpOnly cookie ผ่าน backend (session อยู่ที่ cookie ที่เดียว)
      // client ตั้ง persistSession:false ไว้ (ดู lib/supabase.js) จึงไม่ต้อง signOut -
      // ห้ามเรียก signOut เด็ดขาด เพราะทุก scope (รวม 'local') ยิง POST /logout
      // ไป revoke session ปัจจุบันที่ Supabase = ฆ่า session ที่เพิ่งโอนเข้า cookie
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            await authApi.session({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            })
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
          }
        } catch { /* ถ้าโอนไม่สำเร็จ ค่อยให้ผู้ใช้ล็อกอินใหม่ */ }
      }
      await reload()
      try { sessionStorage.removeItem(OAUTH_FLAG) } catch { /* ignore */ }
      if (alive) setLoading(false)
      // คง overlay ไว้ครบขั้นต่ำก่อนปิด (กันกระพริบ)
      if (wasOauth) {
        const left = OAUTH_OVERLAY_MIN_MS - (Date.now() - started)
        if (left > 0) await new Promise((r) => setTimeout(r, left))
      }
      if (alive) setOauthPending(false)
    })()
    return () => { alive = false }
  }, [reload])

  // ===== โหมด Supabase ตรง (fallback เมื่อยังไม่เปิดใช้ backend) =====
  useEffect(() => {
    if (apiEnabled) return
    if (!isSupabaseConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      try { sessionStorage.removeItem(OAUTH_FLAG) } catch { /* ignore */ }
      setLoading(false)
      setOauthPending(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null))
    return () => data.subscription?.unsubscribe()
  }, [])

  // โหลด profile (มี role) เมื่อ user เปลี่ยน - เฉพาะโหมด Supabase ตรง
  useEffect(() => {
    if (apiEnabled) return
    if (!user) { setProfile(null); return }
    let alive = true
    supabase.from('profiles').select('id,full_name,phone,email,role').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setProfile(data) })
    return () => { alive = false }
  }, [user])

  const signOut = async () => {
    if (apiEnabled) { try { await authApi.logout() } catch { /* ล้าง state ต่อแม้ revoke ไม่สำเร็จ */ } }
    else { await supabase.auth.signOut() }
    setUser(null)
    setProfile(null)
  }

  return (
    <Ctx.Provider value={{ user, profile, isAdmin: profile?.role === 'admin', loading, oauthPending, signOut, reload }}>
      {children}
    </Ctx.Provider>
  )
}
