import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { AppEnv } from '../lib/env'
import { anonClient, userClient, adminClient } from '../lib/supabase'
import { setSessionCookies, clearSessionCookies, getRefreshToken, getAccessToken, getRemember } from '../lib/cookies'
import { verifyTurnstile } from '../lib/turnstile'
import { checkEmailDeliverable } from '../lib/email'
import { getUserFromToken } from '../lib/session'
import { HttpError, badRequest, unauthorized } from '../lib/http'
import { ErrorSchema, OkSchema, jsonBody, jsonRes, errRes } from '../lib/openapi'

const TAG = ['Auth']

const UserSchema = z
  .object({
    id: z.string(),
    email: z.string().nullable(),
    full_name: z.string().nullable(),
    phone: z.string().nullable(),
    role: z.string(),
  })
  .openapi('AuthUser')

const LoginBody = z
  .object({
    email: z.string().email().openapi({ example: 'you@email.com' }),
    password: z.string().min(1),
    captchaToken: z.string().optional(),
    // จดจำฉัน: true = session อยู่ได้ 7 วัน / false (ค่าเริ่มต้น) = หลุดเองเมื่อไม่ใช้งาน 1 ชม.
    remember: z.boolean().optional(),
  })
  .openapi('LoginBody')

const RegisterBody = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(1),
    phone: z.string().min(1),
    captchaToken: z.string().optional(),
  })
  .openapi('RegisterBody')

async function loadProfile(env: AppEnv['Bindings'], token: string, id: string) {
  const db = userClient(env, token)
  const { data } = await db
    .from('profiles')
    .select('id,email,full_name,phone,role')
    .eq('id', id)
    .maybeSingle()
  return data
}

export function registerAuth(app: OpenAPIHono<AppEnv>) {
  // ---------- POST /api/auth/register ----------
  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/auth/register',
      tags: TAG,
      summary: 'สมัครสมาชิก (ห่อ Supabase Auth + Turnstile)',
      request: { body: jsonBody(RegisterBody) },
      responses: {
        200: jsonRes('สมัครสำเร็จ (อาจต้องยืนยันอีเมล)', z.object({
          ok: z.literal(true),
          needsConfirm: z.boolean(),
          user: UserSchema.nullable(),
        })),
        400: errRes('ข้อมูลไม่ถูกต้อง / captcha ไม่ผ่าน'),
      },
    }),
    async (c) => {
      const b = c.req.valid('json')
      const ip = c.req.header('cf-connecting-ip')
      if (!(await verifyTurnstile(c.env, b.captchaToken, ip))) throw badRequest('ยืนยันตัวตน (captcha) ไม่ผ่าน')
      // กันอีเมล bounce: โดเมนพิมพ์ผิด/อีเมลชั่วคราว/โดเมนไม่รับเมล -> ปฏิเสธก่อนส่งให้ Supabase
      const emailCheck = await checkEmailDeliverable(b.email)
      if (!emailCheck.ok) throw badRequest(emailCheck.error)
      const supa = anonClient(c.env)
      const { data, error } = await supa.auth.signUp({
        email: b.email,
        password: b.password,
        options: { data: { full_name: b.full_name, phone: b.phone } },
      })
      if (error) throw badRequest(error.message)
      // Supabase ตอบ "สำเร็จ" แม้อีเมลซ้ำ (กัน email enumeration) แต่ identities จะว่าง
      // -> บอกผู้ใช้ตรงๆ ว่าอีเมลนี้มีบัญชีแล้ว จะได้ไปหน้าเข้าสู่ระบบแทน
      if (data.user && (data.user.identities?.length ?? 0) === 0)
        throw badRequest('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ')
      if (data.session) {
        setSessionCookies(c, data.session.access_token, data.session.refresh_token, false)
        const prof = await loadProfile(c.env, data.session.access_token, data.user!.id)
        return c.json({ ok: true as const, needsConfirm: false, user: prof ?? null })
      }
      // โปรเจกต์เปิด "Confirm email" ไว้ -> signUp ยังไม่ให้ session
      // นโยบายร้าน: สมัครแล้วใช้งานได้ทันที ไม่ต้องยืนยันอีเมล
      // ถ้ามี service key ให้ยืนยันอีเมลแทนผู้ใช้แล้วเข้าสู่ระบบให้เลย
      if (data.user && c.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { error: confirmErr } = await adminClient(c.env).auth.admin.updateUserById(data.user.id, {
          email_confirm: true,
        })
        if (!confirmErr) {
          const { data: si, error: siErr } = await supa.auth.signInWithPassword({
            email: b.email,
            password: b.password,
          })
          if (!siErr && si.session) {
            setSessionCookies(c, si.session.access_token, si.session.refresh_token, false)
            const prof = await loadProfile(c.env, si.session.access_token, si.user.id)
            return c.json({ ok: true as const, needsConfirm: false, user: prof ?? null })
          }
        }
      }
      // ไม่มี service key (เช่น dev ที่ไม่ได้ตั้ง) -> ต้องยืนยันอีเมลตามปกติ
      return c.json({ ok: true as const, needsConfirm: true, user: null })
    }
  )

  // ---------- POST /api/auth/login ----------
  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/auth/login',
      tags: TAG,
      summary: 'เข้าสู่ระบบ -> ตั้ง HttpOnly cookie (access 15 นาที / refresh 7 วัน)',
      request: { body: jsonBody(LoginBody) },
      responses: {
        200: jsonRes('เข้าสู่ระบบสำเร็จ', z.object({ ok: z.literal(true), user: UserSchema })),
        400: errRes('captcha ไม่ผ่าน'),
        401: errRes('อีเมลหรือรหัสผ่านไม่ถูกต้อง'),
      },
    }),
    async (c) => {
      const b = c.req.valid('json')
      const ip = c.req.header('cf-connecting-ip')
      if (!(await verifyTurnstile(c.env, b.captchaToken, ip))) throw badRequest('ยืนยันตัวตน (captcha) ไม่ผ่าน')
      const supa = anonClient(c.env)
      const { data, error } = await supa.auth.signInWithPassword({ email: b.email, password: b.password })
      if (error || !data.session) throw new HttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'invalid_credentials')
      setSessionCookies(c, data.session.access_token, data.session.refresh_token, b.remember === true)
      const prof = await loadProfile(c.env, data.session.access_token, data.user.id)
      return c.json({
        ok: true as const,
        user: prof ?? { id: data.user.id, email: data.user.email ?? null, full_name: null, phone: null, role: 'customer' },
      })
    }
  )

  // ---------- POST /api/auth/session (นำ session จาก OAuth ฝั่ง client เข้าเป็น HttpOnly cookie) ----------
  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/auth/session',
      tags: TAG,
      summary: 'แลก token (เช่นจาก Google OAuth ฝั่ง client) เป็น HttpOnly cookie session',
      request: {
        body: jsonBody(z.object({
          access_token: z.string().min(1),
          refresh_token: z.string().min(1),
          remember: z.boolean().optional(),
        }).openapi('SessionBody')),
      },
      responses: {
        200: jsonRes('ตั้ง session แล้ว', z.object({ ok: z.literal(true), user: UserSchema })),
        401: errRes('token ไม่ถูกต้อง/หมดอายุ'),
      },
    }),
    async (c) => {
      const { access_token, refresh_token, remember } = c.req.valid('json')
      // ตรวจ token กับ Supabase ก่อน (กันตั้งคุกกี้จาก token ปลอม)
      const { data, error } = await anonClient(c.env).auth.getUser(access_token)
      if (error || !data.user) throw unauthorized('token ไม่ถูกต้องหรือหมดอายุ')
      // OAuth (Google) ค่าเริ่มต้น = จดจำ (ผู้ใช้เลือกบัญชีผ่าน Google แล้ว ไม่มีช่องติ๊กในฟอร์ม)
      setSessionCookies(c, access_token, refresh_token, remember !== false)
      const prof = await loadProfile(c.env, access_token, data.user.id)
      return c.json({
        ok: true as const,
        user: prof ?? { id: data.user.id, email: data.user.email ?? null, full_name: null, phone: null, role: 'customer' },
      })
    }
  )

  // ---------- POST /api/auth/refresh ----------
  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/auth/refresh',
      tags: TAG,
      summary: 'ต่ออายุ session ด้วย refresh cookie (rotation) - ออก access ใหม่',
      responses: {
        200: jsonRes('ต่ออายุสำเร็จ', OkSchema),
        401: errRes('refresh หมดอายุ/ไม่ถูกต้อง -> ต้องเข้าสู่ระบบใหม่'),
      },
    }),
    async (c) => {
      const rt = getRefreshToken(c)
      if (!rt) throw unauthorized('ไม่มี refresh token')
      const supa = anonClient(c.env)
      const { data, error } = await supa.auth.refreshSession({ refresh_token: rt })
      if (error || !data.session) {
        // error ชั่วคราวฝั่ง Supabase (5xx/เน็ตสะดุด) ห้ามล้างคุกกี้ - ไม่งั้นผู้ใช้โดนเด้งออก
        // ทั้งที่ refresh token ยังใช้ได้ (สาเหตุ "ใช้งานอยู่ดีๆ session หลุด")
        if (error && (error.status ?? 0) >= 500) throw new HttpError(503, 'ระบบยืนยันตัวตนขัดข้องชั่วคราว ลองใหม่อีกครั้ง', 'auth_unavailable')
        clearSessionCookies(c)
        throw unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
      }
      // rotation: Supabase คืน refresh token ใหม่ทุกครั้ง -> เก็บตัวใหม่
      // พร้อมเลื่อนหน้าต่าง idle ออกไป (คงโหมดจดจำ/ไม่จดจำ ตามที่เลือกไว้ตอน login)
      setSessionCookies(c, data.session.access_token, data.session.refresh_token, getRemember(c))
      return c.json({ ok: true as const })
    }
  )

  // ---------- POST /api/auth/logout ----------
  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/auth/logout',
      tags: TAG,
      summary: 'ออกจากระบบ - เพิกถอน session ที่ Supabase + ล้างคุกกี้',
      responses: { 200: jsonRes('ออกจากระบบแล้ว', OkSchema) },
    }),
    async (c) => {
      const at = getAccessToken(c)
      const rt = getRefreshToken(c)
      if (at && rt) {
        try {
          const supa = anonClient(c.env)
          await supa.auth.setSession({ access_token: at, refresh_token: rt })
          await supa.auth.signOut()
        } catch {
          // best-effort: ถึง revoke ไม่สำเร็จก็ล้างคุกกี้ต่อ
        }
      }
      clearSessionCookies(c)
      return c.json({ ok: true as const })
    }
  )

  // ---------- GET /api/auth/me ----------
  // ไม่คืน 401: ผู้เยี่ยมชมที่ยังไม่ล็อกอินเป็นเรื่องปกติ ไม่ใช่ error
  // (401 ทำให้ browser พ่น "Failed to load resource" ทุกครั้งที่เปิดเว็บ)
  // access หมดอายุแต่ยังมี refresh cookie -> ตอบ refreshable=true ให้ client ต่ออายุแล้วถามซ้ำ
  app.openapi(
    createRoute({
      method: 'get',
      path: '/api/auth/me',
      tags: TAG,
      summary: 'ข้อมูลผู้ใช้ปัจจุบัน (user=null เมื่อยังไม่ได้เข้าสู่ระบบ - ไม่คืน 401)',
      responses: {
        200: jsonRes('ผู้ใช้ปัจจุบัน หรือ user=null (refreshable=true คือมี refresh cookie ให้ลอง POST /api/auth/refresh)', z.object({
          ok: z.literal(true),
          user: UserSchema.nullable(),
          refreshable: z.boolean().optional(),
        })),
      },
    }),
    async (c) => {
      const token = getAccessToken(c)
      if (token) {
        const u = await getUserFromToken(c.env, token)
        if (u) {
          const prof = await loadProfile(c.env, token, u.id)
          return c.json({
            ok: true as const,
            user: prof ?? { id: u.id, email: u.email ?? null, full_name: null, phone: null, role: 'customer' },
          })
        }
      }
      return c.json({ ok: true as const, user: null, refreshable: !!getRefreshToken(c) })
    }
  )
}
