import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// นำทางไปหน้า login/register จริง (แทน popup modal เดิม) พร้อมจำหน้าเดิมไว้กลับมา
// ใช้แทน useAuthModal เก่า - call site เดิมเรียก open('login') / open('register') ได้เหมือนเดิม
export function useAuthNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const open = useCallback((view = 'login') => {
    const here = loc.pathname + loc.search
    const redirect = here && here !== '/login' && here !== '/register' ? `?redirect=${encodeURIComponent(here)}` : ''
    nav(`/${view === 'register' ? 'register' : 'login'}${redirect}`)
  }, [nav, loc.pathname, loc.search])
  return { open }
}
