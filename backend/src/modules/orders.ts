import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { AppEnv } from '../lib/env'
import { authedDb, userClient, anonClient } from '../lib/supabase'
import { getAccessToken } from '../lib/cookies'
import { requireAuth } from '../lib/middleware'
import { badRequest, notFound } from '../lib/http'
import { jsonBody, jsonRes, errRes } from '../lib/openapi'

const TAG = ['Orders']

const OrderItemSchema = z.object({
  id: z.string(), name: z.string().nullable(), price: z.number(), qty: z.number(), product_id: z.string().nullable(),
})
const OrderSchema = z
  .object({
    id: z.string(), code: z.string(), user_id: z.string().nullable(), total: z.number(), status: z.string(),
    payment_method: z.string().nullable(), ship_name: z.string().nullable(), ship_phone: z.string().nullable(),
    ship_address: z.string().nullable(), created_at: z.string(), order_items: z.array(OrderItemSchema).optional(),
    tracking_no: z.string().nullable().optional(), courier: z.string().nullable().optional(),
    cancel_reason: z.string().nullable().optional(), paid_at: z.string().nullable().optional(),
  })
  .openapi('Order')

const CreateOrderBody = z
  .object({
    items: z.array(z.object({ slug: z.string(), qty: z.number().int().positive() })).min(1),
    ship: z.object({ name: z.string().min(1), phone: z.string().min(1), address: z.string().min(1) }),
  })
  .openapi('CreateOrder')

export function registerOrders(app: OpenAPIHono<AppEnv>) {
  // POST /api/orders - สร้างออเดอร์ (คิดราคาจาก DB ใหม่กันแก้ฝั่ง client)
  app.openapi(
    createRoute({
      method: 'post', path: '/api/orders', tags: TAG, summary: 'สร้างคำสั่งซื้อ',
      middleware: [requireAuth] as const,
      request: { body: jsonBody(CreateOrderBody) },
      responses: { 200: jsonRes('สร้างแล้ว', z.object({ ok: z.literal(true), order: OrderSchema })), 400: errRes('error'), 401: errRes('ต้องเข้าสู่ระบบ') },
    }),
    async (c) => {
      const uid = c.get('user').id
      const { items, ship } = c.req.valid('json') as z.infer<typeof CreateOrderBody>
      const db = authedDb(c)
      const slugs = items.map((i) => i.slug)
      const { data: prods, error: e1 } = await db.from('products').select('id,slug,name,price,sale_price,stock').in('slug', slugs)
      if (e1) throw badRequest(e1.message)
      const bySlug = Object.fromEntries((prods ?? []).map((p: any) => [p.slug, p]))
      const priceOf = (p: any) => (p.sale_price && p.sale_price < p.price ? p.sale_price : p.price)
      const lines = items
        .filter((i) => bySlug[i.slug])
        .map((i) => { const p = bySlug[i.slug]; return { product_id: p.id, name: p.name, price: priceOf(p), qty: i.qty } })
      if (!lines.length) throw badRequest('ไม่มีสินค้าในตะกร้า')
      const subtotal = lines.reduce((s: number, l) => s + l.price * l.qty, 0)
      const total = subtotal + (subtotal >= 1500 ? 0 : 80)
      const { data: order, error: e2 } = await db.from('orders').insert({
        user_id: uid, total, status: 'pending', payment_method: 'promptpay',
        ship_name: ship.name, ship_phone: ship.phone, ship_address: ship.address,
      }).select().single()
      if (e2) throw badRequest(e2.message)
      const { error: e3 } = await db.from('order_items').insert(lines.map((l) => ({ ...l, order_id: order.id })))
      if (e3) throw badRequest(e3.message)
      return c.json({ ok: true as const, order })
    }
  )

  // GET /api/orders - ประวัติของฉัน
  app.openapi(
    createRoute({
      method: 'get', path: '/api/orders', tags: TAG, summary: 'ประวัติคำสั่งซื้อของฉัน',
      middleware: [requireAuth] as const,
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(OrderSchema) })), 401: errRes('ต้องเข้าสู่ระบบ') },
    }),
    async (c) => {
      const uid = c.get('user').id
      const db = authedDb(c)
      const { data, error } = await db.from('orders').select('*, order_items(*)').eq('user_id', uid).order('created_at', { ascending: false })
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: data ?? [] })
    }
  )

  // POST /api/orders/{id}/cancel - ลูกค้ายกเลิก/ขอยกเลิกคำสั่งซื้อของตัวเอง
  // pending (ยังไม่จ่าย) -> ยกเลิกทันที · paid/packing -> ขอยกเลิก รอแอดมินตรวจ+คืนเงิน
  // shipping/done/cancel* -> ยกเลิกไม่ได้ (ของออกไปแล้ว/จบแล้ว)
  app.openapi(
    createRoute({
      method: 'post', path: '/api/orders/{id}/cancel', tags: TAG, summary: 'ยกเลิก/ขอยกเลิกคำสั่งซื้อของฉัน',
      middleware: [requireAuth] as const,
      request: { params: z.object({ id: z.string().uuid() }), body: jsonBody(z.object({ reason: z.string().max(500).optional() })) },
      responses: {
        200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), status: z.string() })),
        400: errRes('ยกเลิกไม่ได้'), 401: errRes('ต้องเข้าสู่ระบบ'), 404: errRes('ไม่พบคำสั่งซื้อ'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { reason } = c.req.valid('json')
      const db = authedDb(c) // RLS: เห็น/แก้ได้เฉพาะออเดอร์ของตัวเอง
      const { data: order, error } = await db.from('orders').select('id,status').eq('id', id).maybeSingle()
      if (error) throw badRequest(error.message)
      if (!order) throw notFound('ไม่พบคำสั่งซื้อ')
      if (order.status === 'pending') {
        const { error: e } = await db.from('orders')
          .update({ status: 'cancel', cancel_reason: reason || null, canceled_at: new Date().toISOString() }).eq('id', id)
        if (e) throw badRequest(e.message)
        return c.json({ ok: true as const, status: 'cancel' })
      }
      if (order.status === 'paid' || order.status === 'packing') {
        const { error: e } = await db.from('orders')
          .update({ status: 'cancel_requested', cancel_reason: reason || null }).eq('id', id)
        if (e) throw badRequest(e.message)
        return c.json({ ok: true as const, status: 'cancel_requested' })
      }
      throw badRequest('คำสั่งซื้อนี้ยกเลิกไม่ได้ (จัดส่งแล้ว/ยกเลิกแล้ว)')
    }
  )

  // GET /api/orders/track/{code} - ติดตามด้วยรหัสออเดอร์ (สาธารณะ)
  app.openapi(
    createRoute({
      method: 'get', path: '/api/orders/track/{code}', tags: TAG, summary: 'ติดตามคำสั่งซื้อด้วยรหัส',
      request: { params: z.object({ code: z.string() }) },
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), order: OrderSchema })), 404: errRes('ไม่พบคำสั่งซื้อ') },
    }),
    async (c) => {
      const { code } = c.req.valid('param')
      // ติดตามด้วยรหัส: ถ้ามี session ใช้สิทธิ์ user (เห็นเฉพาะออเดอร์ตัวเอง/แอดมิน ตาม RLS)
      const token = getAccessToken(c)
      const db = token ? userClient(c.env, token) : anonClient(c.env)
      const { data, error } = await db.from('orders').select('*, order_items(*)').eq('code', code).maybeSingle()
      if (error) throw badRequest(error.message)
      if (!data) throw notFound('ไม่พบคำสั่งซื้อ')
      return c.json({ ok: true as const, order: data })
    }
  )
}
