import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { AppEnv } from '../lib/env'
import { authedDb, anonClient } from '../lib/supabase'
import { requireAdmin } from '../lib/middleware'
import { badRequest } from '../lib/http'
import { OkSchema, jsonBody, jsonRes, errRes } from '../lib/openapi'

const TAG = ['Admin']
const IdParam = z.object({ id: z.string().uuid() })

const ProductBody = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1), slug: z.string().min(1),
  category_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  price: z.number(), old_price: z.number().nullable().optional(), sale_price: z.number().nullable().optional(),
  stock: z.number().optional(), badge: z.string().nullable().optional(),
  images: z.array(z.string()).optional(), specs: z.record(z.any()).optional(),
  description: z.string().nullable().optional(), is_active: z.boolean().optional(), is_featured: z.boolean().optional(),
}).openapi('AdminProductBody')

const SlideBody = z.object({
  id: z.string().uuid().optional(), placement: z.string(), title: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(), link: z.string().nullable().optional(),
  sort: z.number().optional(), is_active: z.boolean().optional(),
}).openapi('AdminSlideBody')

const BrandBody = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1), name: z.string().min(1),
  logo_url: z.string().nullable().optional(), sort: z.number().optional(),
}).openapi('AdminBrandBody')

const CategoryBody = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1), name_th: z.string().min(1), name_en: z.string().min(1),
  icon: z.string().nullable().optional(), sort: z.number().optional(),
}).openapi('AdminCategoryBody')

const okItems = jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(z.record(z.any())) }))

export function registerAdmin(app: OpenAPIHono<AppEnv>) {
  // ---------- PRODUCTS ----------
  app.openapi(
    createRoute({ method: 'get', path: '/api/admin/products', tags: TAG, summary: 'รายการสินค้า (admin)', middleware: [requireAdmin] as const,
      responses: { 200: okItems, 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { data, error } = await authedDb(c).from('products').select('*, categories(slug,name_th), brands(slug,name)').order('created_at', { ascending: false })
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: data ?? [] })
    }
  )
  app.openapi(
    createRoute({ method: 'post', path: '/api/admin/products', tags: TAG, summary: 'เพิ่ม/แก้ไขสินค้า', middleware: [requireAdmin] as const,
      request: { body: jsonBody(ProductBody) }, responses: { 200: jsonRes('บันทึกแล้ว', OkSchema), 400: errRes('error'), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const p = c.req.valid('json')
      const row = {
        name: p.name, slug: p.slug, category_id: p.category_id || null, brand_id: p.brand_id || null,
        price: Number(p.price) || 0, old_price: p.old_price ?? null, sale_price: p.sale_price ?? null,
        stock: Number(p.stock) || 0, badge: p.badge || null, images: p.images || [], specs: p.specs || {},
        description: p.description || null, is_active: p.is_active !== false, is_featured: !!p.is_featured,
      }
      const db = authedDb(c)
      const res = p.id ? await db.from('products').update(row).eq('id', p.id) : await db.from('products').insert(row)
      if (res.error) throw badRequest(res.error.message)
      return c.json({ ok: true as const })
    }
  )
  app.openapi(
    createRoute({ method: 'delete', path: '/api/admin/products/{id}', tags: TAG, summary: 'ลบสินค้า', middleware: [requireAdmin] as const,
      request: { params: IdParam }, responses: { 200: jsonRes('ลบแล้ว', OkSchema), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { error } = await authedDb(c).from('products').delete().eq('id', c.req.valid('param').id)
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )

  // ---------- SLIDES ----------
  app.openapi(
    createRoute({ method: 'get', path: '/api/admin/slides', tags: TAG, summary: 'รายการสไลด์ (admin)', middleware: [requireAdmin] as const,
      responses: { 200: okItems, 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { data, error } = await authedDb(c).from('slides').select('*').order('placement').order('sort')
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: data ?? [] })
    }
  )
  app.openapi(
    createRoute({ method: 'post', path: '/api/admin/slides', tags: TAG, summary: 'เพิ่ม/แก้ไขสไลด์', middleware: [requireAdmin] as const,
      request: { body: jsonBody(SlideBody) }, responses: { 200: jsonRes('บันทึกแล้ว', OkSchema), 400: errRes('error'), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const s = c.req.valid('json')
      const row = { placement: s.placement, title: s.title || null, image_url: s.image_url || null, link: s.link || null, sort: Number(s.sort) || 0, is_active: s.is_active !== false }
      const db = authedDb(c)
      const res = s.id ? await db.from('slides').update(row).eq('id', s.id) : await db.from('slides').insert(row)
      if (res.error) throw badRequest(res.error.message)
      return c.json({ ok: true as const })
    }
  )
  app.openapi(
    createRoute({ method: 'delete', path: '/api/admin/slides/{id}', tags: TAG, summary: 'ลบสไลด์', middleware: [requireAdmin] as const,
      request: { params: IdParam }, responses: { 200: jsonRes('ลบแล้ว', OkSchema), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { error } = await authedDb(c).from('slides').delete().eq('id', c.req.valid('param').id)
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )

  // ---------- BRANDS ----------
  app.openapi(
    createRoute({ method: 'post', path: '/api/admin/brands', tags: TAG, summary: 'เพิ่ม/แก้ไขแบรนด์', middleware: [requireAdmin] as const,
      request: { body: jsonBody(BrandBody) }, responses: { 200: jsonRes('บันทึกแล้ว', OkSchema), 400: errRes('error'), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const b = c.req.valid('json')
      const row = { slug: b.slug, name: b.name, logo_url: b.logo_url || null, sort: Number(b.sort) || 0 }
      const db = authedDb(c)
      const res = b.id ? await db.from('brands').update(row).eq('id', b.id) : await db.from('brands').insert(row)
      if (res.error) throw badRequest(res.error.message)
      return c.json({ ok: true as const })
    }
  )
  app.openapi(
    createRoute({ method: 'delete', path: '/api/admin/brands/{id}', tags: TAG, summary: 'ลบแบรนด์', middleware: [requireAdmin] as const,
      request: { params: IdParam }, responses: { 200: jsonRes('ลบแล้ว', OkSchema), 400: errRes('error'), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { error } = await authedDb(c).from('brands').delete().eq('id', c.req.valid('param').id)
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )

  // ---------- CATEGORIES ----------
  app.openapi(
    createRoute({ method: 'post', path: '/api/admin/categories', tags: TAG, summary: 'เพิ่ม/แก้ไขหมวดหมู่', middleware: [requireAdmin] as const,
      request: { body: jsonBody(CategoryBody) }, responses: { 200: jsonRes('บันทึกแล้ว', OkSchema), 400: errRes('error'), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const g = c.req.valid('json')
      const row = { slug: g.slug, name_th: g.name_th, name_en: g.name_en, icon: g.icon || null, sort: Number(g.sort) || 0 }
      const db = authedDb(c)
      const res = g.id ? await db.from('categories').update(row).eq('id', g.id) : await db.from('categories').insert(row)
      if (res.error) throw badRequest(res.error.message)
      return c.json({ ok: true as const })
    }
  )
  app.openapi(
    createRoute({ method: 'delete', path: '/api/admin/categories/{id}', tags: TAG, summary: 'ลบหมวดหมู่', middleware: [requireAdmin] as const,
      request: { params: IdParam }, responses: { 200: jsonRes('ลบแล้ว', OkSchema), 400: errRes('error'), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { error } = await authedDb(c).from('categories').delete().eq('id', c.req.valid('param').id)
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )

  // ---------- ORDERS ----------
  app.openapi(
    createRoute({ method: 'get', path: '/api/admin/orders', tags: TAG, summary: 'รายการออเดอร์ทั้งหมด', middleware: [requireAdmin] as const,
      responses: { 200: okItems, 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { data, error } = await authedDb(c).from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: data ?? [] })
    }
  )
  app.openapi(
    createRoute({ method: 'patch', path: '/api/admin/orders/{id}/status', tags: TAG, summary: 'อัปเดตสถานะออเดอร์', middleware: [requireAdmin] as const,
      request: { params: IdParam, body: jsonBody(z.object({ status: z.enum(['pending', 'paid', 'packing', 'shipping', 'done', 'cancel']) })) },
      responses: { 200: jsonRes('อัปเดตแล้ว', OkSchema), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { status } = c.req.valid('json')
      const { error } = await authedDb(c).from('orders').update({ status }).eq('id', c.req.valid('param').id)
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )

  // ---------- STATS ----------
  app.openapi(
    createRoute({ method: 'get', path: '/api/admin/stats', tags: TAG, summary: 'สถิติภาพรวม', middleware: [requireAdmin] as const,
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), products: z.number(), orders: z.number(), revenue: z.number() })), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const db = authedDb(c)
      const [pc, oc, rev] = await Promise.all([
        db.from('products').select('id', { count: 'exact', head: true }),
        db.from('orders').select('id', { count: 'exact', head: true }),
        db.from('orders').select('total'),
      ])
      const revenue = (rev.data ?? []).reduce((s: number, o: any) => s + (o.total || 0), 0)
      return c.json({ ok: true as const, products: pc.count || 0, orders: oc.count || 0, revenue })
    }
  )

  // ---------- SETTINGS (อ่านสาธารณะ / เขียนเฉพาะแอดมิน) ----------
  app.openapi(
    createRoute({ method: 'get', path: '/api/settings/{key}', tags: TAG, summary: 'อ่านค่าตั้งเว็บ (สาธารณะ)',
      request: { params: z.object({ key: z.string() }) },
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), value: z.record(z.any()).nullable() })) } }),
    async (c) => {
      const { key } = c.req.valid('param')
      const { data, error } = await anonClient(c.env).from('site_settings').select('value').eq('key', key).maybeSingle()
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, value: data?.value ?? null })
    }
  )
  app.openapi(
    createRoute({ method: 'put', path: '/api/admin/settings/{key}', tags: TAG, summary: 'บันทึกค่าตั้งเว็บ', middleware: [requireAdmin] as const,
      request: { params: z.object({ key: z.string() }), body: jsonBody(z.object({ value: z.record(z.any()) })) },
      responses: { 200: jsonRes('บันทึกแล้ว', OkSchema), 403: errRes('ต้องเป็นแอดมิน') } }),
    async (c) => {
      const { key } = c.req.valid('param')
      const { value } = c.req.valid('json')
      const { error } = await authedDb(c).from('site_settings').upsert({ key, value }, { onConflict: 'key' })
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )
}
