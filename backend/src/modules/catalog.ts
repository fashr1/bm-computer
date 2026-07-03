import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { AppEnv } from '../lib/env'
import { anonClient, authedDb } from '../lib/supabase'
import { requireAuth } from '../lib/middleware'
import { getAccessToken } from '../lib/cookies'
import { getUserFromToken } from '../lib/session'
import { badRequest, notFound } from '../lib/http'
import { OkSchema, jsonBody, jsonRes, errRes } from '../lib/openapi'

const TAG = ['Catalog']

// ---- แปลง row -> รูปแบบที่ frontend ใช้ (พอร์ตจาก src/lib/api.js) ----
export function mapProduct(row: any) {
  const onSale = row.sale_price && row.sale_price < row.price
  const price = onSale ? row.sale_price : row.price
  const old = onSale ? row.price : row.old_price
  const discount = old && old > price ? Math.round(((old - price) / old) * 100) : 0
  return {
    id: row.slug,
    slug: row.slug,
    sku: 'BM-' + String(row.slug).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    name: row.name,
    cat: row.categories?.slug ?? null,
    brand: row.brands?.name ?? null,
    price,
    old: old ?? null,
    discount,
    sale: !!onSale,
    saleEndsAt: row.sale_ends_at ?? null,
    rating: row.rating ?? null,
    reviews: row.reviews_count ?? 0,
    stock: row.stock ?? 0,
    badge: row.badge ?? null,
    images: Array.isArray(row.images) ? row.images : [],
    specs: row.specs || {},
    featured: !!row.is_featured,
  }
}

export const ProductSchema = z
  .object({
    id: z.string(), slug: z.string(), sku: z.string(), name: z.string(),
    cat: z.string().nullable(), brand: z.string().nullable(),
    price: z.number(), old: z.number().nullable(), discount: z.number(),
    sale: z.boolean(), saleEndsAt: z.string().nullable(),
    rating: z.number().nullable(), reviews: z.number(), stock: z.number(),
    badge: z.string().nullable(), images: z.array(z.string()),
    specs: z.record(z.any()), featured: z.boolean(),
  })
  .openapi('Product')

const SELECT = '*, categories!inner(slug,name_th,name_en), brands!inner(name,slug)'
const CatSchema = z.object({ id: z.string(), slug: z.string(), name_th: z.string(), name_en: z.string(), icon: z.string().nullable(), sort: z.number() }).openapi('Category')
const BrandSchema = z.object({ id: z.string(), slug: z.string(), name: z.string(), logo_url: z.string().nullable(), sort: z.number() }).openapi('Brand')
const SlideSchema = z.object({ id: z.string(), placement: z.string(), title: z.string().nullable(), image_url: z.string().nullable(), link: z.string().nullable(), sort: z.number(), is_active: z.boolean() }).openapi('Slide')

export function registerCatalog(app: OpenAPIHono<AppEnv>) {
  // GET /api/catalog/products
  app.openapi(
    createRoute({
      method: 'get', path: '/api/catalog/products', tags: TAG, summary: 'รายการสินค้า (กรอง cat/brand/featured)',
      request: {
        query: z.object({
          cat: z.string().optional(),
          brand: z.string().optional(),
          featured: z.enum(['true', 'false']).optional(),
          limit: z.coerce.number().int().positive().max(100).optional(),
        }),
      },
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(ProductSchema) })), 400: errRes('error') },
    }),
    async (c) => {
      const { cat, brand, featured, limit } = c.req.valid('query')
      const db = anonClient(c.env)
      let q = db.from('products').select(SELECT).eq('is_active', true)
      if (cat) q = q.eq('categories.slug', cat)
      if (brand) q = q.eq('brands.slug', brand)
      if (featured === 'true') q = q.eq('is_featured', true)
      q = q.order('created_at', { ascending: true })
      if (limit) q = q.limit(limit)
      const { data, error } = await q
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: (data ?? []).map(mapProduct) })
    }
  )

  // GET /api/catalog/products/{slug}
  app.openapi(
    createRoute({
      method: 'get', path: '/api/catalog/products/{slug}', tags: TAG, summary: 'รายละเอียดสินค้า',
      request: { params: z.object({ slug: z.string() }) },
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), item: ProductSchema })), 404: errRes('ไม่พบสินค้า') },
    }),
    async (c) => {
      const { slug } = c.req.valid('param')
      const db = anonClient(c.env)
      const { data, error } = await db.from('products').select(SELECT).eq('slug', slug).maybeSingle()
      if (error) throw badRequest(error.message)
      if (!data) throw notFound('ไม่พบสินค้า')
      return c.json({ ok: true as const, item: mapProduct(data) })
    }
  )

  // GET /api/catalog/categories
  app.openapi(
    createRoute({
      method: 'get', path: '/api/catalog/categories', tags: TAG, summary: 'หมวดหมู่',
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(CatSchema) })) },
    }),
    async (c) => {
      const db = anonClient(c.env)
      const { data, error } = await db.from('categories').select('*').order('sort', { ascending: true })
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: data ?? [] })
    }
  )

  // GET /api/catalog/brands
  app.openapi(
    createRoute({
      method: 'get', path: '/api/catalog/brands', tags: TAG, summary: 'แบรนด์',
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(BrandSchema) })) },
    }),
    async (c) => {
      const db = anonClient(c.env)
      const { data, error } = await db.from('brands').select('*').order('sort', { ascending: true })
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const, items: data ?? [] })
    }
  )

  // GET /api/catalog/slides
  app.openapi(
    createRoute({
      method: 'get', path: '/api/catalog/slides', tags: TAG, summary: 'สไลด์/แบนเนอร์',
      request: { query: z.object({ placement: z.string().optional() }) },
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(SlideSchema) })) },
    }),
    async (c) => {
      const { placement } = c.req.valid('query')
      const db = anonClient(c.env)
      let q = db.from('slides').select('*').eq('is_active', true).order('sort', { ascending: true })
      if (placement) q = q.eq('placement', placement)
      const { data, error } = await q
      if (error) throw badRequest(error.message)
      const seen = new Set<string>()
      const items = (data ?? []).filter((s: any) => {
        const k = `${s.image_url}|${s.title}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      return c.json({ ok: true as const, items })
    }
  )

  // ---------- REVIEWS ----------
  const ReviewSchema = z.object({
    id: z.string(), rating: z.number(), comment: z.string().nullable(),
    author_name: z.string().nullable(), verified: z.boolean(),
    created_at: z.string(), mine: z.boolean(),
  }).openapi('Review')

  // หา product id จาก slug (anon - เฉพาะสินค้าที่ active)
  async function productIdBySlug(env: AppEnv['Bindings'], slug: string): Promise<string> {
    const { data, error } = await anonClient(env).from('products').select('id').eq('slug', slug).eq('is_active', true).maybeSingle()
    if (error) throw badRequest(error.message)
    if (!data) throw notFound('ไม่พบสินค้า')
    return data.id
  }

  // GET /api/catalog/products/{slug}/reviews - อ่านสาธารณะ (ถ้ามี session จะติดธง mine ให้)
  app.openapi(
    createRoute({
      method: 'get', path: '/api/catalog/products/{slug}/reviews', tags: TAG, summary: 'รีวิวของสินค้า',
      request: { params: z.object({ slug: z.string() }) },
      responses: { 200: jsonRes('สำเร็จ', z.object({ ok: z.literal(true), items: z.array(ReviewSchema) })), 404: errRes('ไม่พบสินค้า') },
    }),
    async (c) => {
      const { slug } = c.req.valid('param')
      const pid = await productIdBySlug(c.env, slug)
      // ระบุตัวตนแบบ optional: มี cookie ก็เช็ค ไม่มีก็เป็น guest
      let uid: string | null = null
      const token = getAccessToken(c)
      if (token) uid = (await getUserFromToken(c.env, token))?.id ?? null
      const { data, error } = await anonClient(c.env)
        .from('reviews')
        .select('id,user_id,rating,comment,author_name,verified,created_at')
        .eq('product_id', pid)
        .order('created_at', { ascending: false })
      if (error) throw badRequest(error.message)
      const items = (data ?? []).map((r: any) => ({
        id: r.id, rating: r.rating, comment: r.comment ?? null,
        author_name: r.author_name ?? null, verified: !!r.verified,
        created_at: r.created_at, mine: !!uid && r.user_id === uid,
      }))
      return c.json({ ok: true as const, items })
    }
  )

  // POST /api/catalog/products/{slug}/reviews - เขียน/แก้รีวิวของตัวเอง (upsert)
  app.openapi(
    createRoute({
      method: 'post', path: '/api/catalog/products/{slug}/reviews', tags: TAG, summary: 'เขียน/แก้รีวิว (ต้องเข้าสู่ระบบ)',
      middleware: [requireAuth] as const,
      request: {
        params: z.object({ slug: z.string() }),
        body: jsonBody(z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() })),
      },
      responses: { 200: jsonRes('บันทึกแล้ว', OkSchema), 401: errRes('ต้องเข้าสู่ระบบ'), 404: errRes('ไม่พบสินค้า') },
    }),
    async (c) => {
      const { slug } = c.req.valid('param')
      const { rating, comment } = c.req.valid('json')
      const user = c.get('user')!
      const pid = await productIdBySlug(c.env, slug)
      const db = authedDb(c)
      // ชื่อผู้รีวิวจาก profile ตัวเอง (RLS own-row) - fallback เป็นส่วนหน้าอีเมล
      const { data: prof } = await db.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const author = prof?.full_name || (user.email ? user.email.split('@')[0] : null)
      // verified = เคยสั่งซื้อสินค้านี้จริง (ออเดอร์ของตัวเองที่ชำระ/ส่งแล้ว - RLS จำกัดให้เห็นแค่ของตัวเอง)
      const { data: bought } = await db
        .from('orders')
        .select('id, order_items!inner(product_id)')
        .eq('order_items.product_id', pid)
        .in('status', ['paid', 'packing', 'shipping', 'done'])
        .limit(1)
      const verified = !!(bought && bought.length)
      const { error } = await db.from('reviews').upsert(
        { product_id: pid, user_id: user.id, rating, comment: comment?.trim() || null, author_name: author, verified },
        { onConflict: 'product_id,user_id' }
      )
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )

  // DELETE /api/catalog/products/{slug}/reviews - ลบรีวิวของตัวเอง
  app.openapi(
    createRoute({
      method: 'delete', path: '/api/catalog/products/{slug}/reviews', tags: TAG, summary: 'ลบรีวิวของตัวเอง',
      middleware: [requireAuth] as const,
      request: { params: z.object({ slug: z.string() }) },
      responses: { 200: jsonRes('ลบแล้ว', OkSchema), 401: errRes('ต้องเข้าสู่ระบบ'), 404: errRes('ไม่พบสินค้า') },
    }),
    async (c) => {
      const { slug } = c.req.valid('param')
      const user = c.get('user')!
      const pid = await productIdBySlug(c.env, slug)
      const { error } = await authedDb(c).from('reviews').delete().eq('product_id', pid).eq('user_id', user.id)
      if (error) throw badRequest(error.message)
      return c.json({ ok: true as const })
    }
  )
}
