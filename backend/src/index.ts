import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import type { AppEnv } from './lib/env'
import { errorHandler } from './lib/http'
import { registerAuth } from './modules/auth'
import { registerAccount } from './modules/account'
import { registerCatalog } from './modules/catalog'
import { registerOrders } from './modules/orders'
import { registerAdmin } from './modules/admin'
import { registerPayments } from './modules/payments'
import { registerBuilder } from './modules/builder'

const app = new OpenAPIHono<AppEnv>({
  // แปลง validation error (zod) เป็นรูปแบบ error กลางของระบบ
  defaultHook: (result, c) => {
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).filter(Boolean).join(', ')
      return c.json({ ok: false, code: 'validation', error: msg || 'ข้อมูลไม่ถูกต้อง' }, 400)
    }
  },
})

app.onError(errorHandler)

// ---- CORS (อนุญาต frontend origin + ส่งคุกกี้ข้ามโดเมนได้) ----
app.use('/api/*', cors({
  origin: (origin, c) => {
    const allowed = (c.env.FRONTEND_ORIGIN || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    if (allowed.includes(origin)) return origin
    return allowed[0] ?? origin
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// ---- security scheme (สำหรับเอกสาร: cookie access token) ----
app.openAPIRegistry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'bm_at',
})

// ---- ลงทะเบียนทุกโมดูล ----
registerAuth(app)
registerAccount(app)
registerCatalog(app)
registerOrders(app)
registerAdmin(app)
registerPayments(app)
registerBuilder(app)

// ---- OpenAPI JSON + Swagger UI ----
app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'BM Computer API',
    version: '0.1.0',
    description: 'Backend API ของ BM Computer (บ้านมีคอม) - Auth (session สั้น/HttpOnly cookie), Account, Catalog, Orders, Admin, Payments',
  },
  servers: [{ url: '/', description: 'same-origin (ผ่าน proxy หรือ route เดียวกัน)' }],
})
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }))

// ---- health / index ----
app.get('/', (c) => c.json({ ok: true, service: 'bm-computer-api', docs: '/api/docs' }))
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }))

export default app
