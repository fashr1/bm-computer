// ตัวเรียก backend API (Cloudflare Worker) พร้อมส่งคุกกี้ session อัตโนมัติ
// - VITE_API_BASE ไม่ตั้ง = ปิดการใช้ API (frontend คงพฤติกรรมเดิม: ต่อ Supabase ตรง)
// - VITE_API_BASE = '/'   = same-origin (dev ผ่าน vite proxy)
// - VITE_API_BASE = URL   = ข้ามโดเมน (prod ไปที่ worker) ส่งคุกกี้ด้วย credentials:'include'
import { tOutside } from '../i18n/translations'

const RAW = import.meta.env.VITE_API_BASE || ''
export const apiEnabled = RAW !== ''
const BASE = RAW === '/' ? '' : RAW.replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// ต่ออายุ session ครั้งเดียว (กัน refresh ซ้อนกันหลายรีเควสต์)
// export ให้ AuthContext ใช้ตอน /me ตอบ user=null + refreshable=true (access หมดอายุแต่ refresh ยังไม่หมด)
let refreshPromise = null
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(BASE + '/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { setTimeout(() => { refreshPromise = null }, 0) })
  }
  return refreshPromise
}

async function request(path, { method = 'GET', body, isForm = false, retry = true } = {}) {
  const opts = { method, credentials: 'include', headers: {} }
  if (body !== undefined) {
    if (isForm) opts.body = body
    else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  }
  const res = await fetch(BASE + path, opts)

  // access หมดอายุ -> ลอง refresh (rotation) หนึ่งครั้งแล้วยิงซ้ำ
  if (res.status === 401 && retry && !path.startsWith('/api/auth/')) {
    const ok = await refreshSession()
    if (ok) return request(path, { method, body, isForm, retry: false })
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error || tOutside('common.error'), res.status, data?.code)
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  put: (p, b) => request(p, { method: 'PUT', body: b }),
  del: (p) => request(p, { method: 'DELETE' }),
  postForm: (p, form) => request(p, { method: 'POST', body: form, isForm: true }),
}
