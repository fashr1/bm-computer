import { supabase, isSupabaseConfigured } from './supabase'
import { api, apiEnabled, ApiError } from './apiClient'
import { tOutside } from '../i18n/translations'
import { categories as _mCats, products as _mProds, brands as _mBrands } from '../data/mock'

// ============================================================
// Mock data — ใช้เมื่อไม่มี Supabase และไม่มี backend (local dev)
// ============================================================
const _CAT_TH = { cpu:'ซีพียู', gpu:'การ์ดจอ', mainboard:'เมนบอร์ด', ram:'แรม', storage:'SSD / HDD', monitor:'จอมอนิเตอร์', notebook:'โน้ตบุ๊ก', gear:'เกมมิ่งเกียร์', case:'เคส', psu:'พาวเวอร์ซัพพลาย', cooling:'ชุดระบายความร้อน' }
const _CAT_EN = { cpu:'CPU', gpu:'GPU', mainboard:'Mainboard', ram:'RAM', storage:'SSD / HDD', monitor:'Monitor', notebook:'Notebook', gear:'Gaming Gear', case:'Case', psu:'Power Supply', cooling:'Cooling' }
export const MOCK_CATEGORIES = _mCats.map((c, i) => ({ ...c, id: i + 1, name_th: _CAT_TH[c.slug] || c.slug, name_en: _CAT_EN[c.slug] || c.slug, sort: i }))
export const MOCK_BRANDS = _mBrands.map((name, i) => ({ id: i + 1, name, slug: name.toLowerCase() }))
export const MOCK_PRODUCTS = _mProds.map((p) => ({ ...p, slug: p.id, images: [], featured: p.badge === 'best', sale: !!(p.old && p.old > p.price), discount: p.old ? Math.round(((p.old - p.price) / p.old) * 100) : 0, sku: 'BM-' + p.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }))

// เมื่อเปิด backend API: เรียกผ่าน backend (session อยู่ใน HttpOnly cookie)
// เมื่อไม่เปิด: fallback ต่อ Supabase ตรง (RLS ผ่าน session ของ supabase-js)
// หมายเหตุ: ในโหมด API เบราว์เซอร์ไม่มี Supabase session -> ออเดอร์/แอดมิน "ต้อง" ผ่าน backend

// แปลง row จาก Supabase -> รูปแบบที่คอมโพเนนต์ใช้ (ใช้เฉพาะ fallback Supabase)
function mapProduct(row) {
  const onSale = row.sale_price && row.sale_price < row.price
  const price = onSale ? row.sale_price : row.price
  const old = onSale ? row.price : row.old_price
  const discount = old && old > price ? Math.round(((old - price) / old) * 100) : 0
  return {
    id: row.slug,
    slug: row.slug,
    sku: 'BM-' + String(row.slug).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    name: row.name,
    cat: row.categories?.slug,
    brand: row.brands?.name,
    price,
    old,
    discount,
    sale: !!onSale,
    saleEndsAt: row.sale_ends_at,
    rating: row.rating,
    reviews: row.reviews_count,
    stock: row.stock,
    badge: row.badge,
    images: Array.isArray(row.images) ? row.images : [],
    specs: row.specs || {},
    attrs: row.attrs || {},
    featured: row.is_featured,
  }
}

const qs = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export async function fetchBrands() {
  if (apiEnabled) return (await api.get('/api/catalog/brands')).items
  if (!isSupabaseConfigured) return MOCK_BRANDS
  const { data, error } = await supabase.from('brands').select('*').order('sort', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchCategories() {
  if (apiEnabled) return (await api.get('/api/catalog/categories')).items
  if (!isSupabaseConfigured) return MOCK_CATEGORIES
  const { data, error } = await supabase.from('categories').select('*').order('sort', { ascending: true })
  if (error) throw error
  return data || []
}

// ดัชนีค้นหาแบบเบา (autocomplete) - โหลดครั้งเดียว (ดู lib/searchIndex.js)
export async function fetchSearchIndex() {
  if (apiEnabled) return (await api.get('/api/catalog/search-index')).items
  if (!isSupabaseConfigured) return MOCK_PRODUCTS.map((p) => ({ slug: p.slug, name: p.name, brand: p.brand || null, cat: p.cat || null, price: p.price, image: null }))
  const { data, error } = await supabase.from('products')
    .select('slug,name,price,sale_price,images,categories(slug),brands(name)').eq('is_active', true)
  if (error) throw error
  return (data || []).map((r) => {
    const onSale = r.sale_price && r.sale_price < r.price
    const imgs = Array.isArray(r.images) ? r.images : []
    return { slug: r.slug, name: r.name, brand: r.brands?.name || null, cat: r.categories?.slug || null, price: onSale ? r.sale_price : r.price, image: imgs[0] || null }
  })
}

// สร้างออเดอร์จริง - โหมด API ผ่าน backend (คิดราคาใหม่ที่ server) · fallback คิดที่นี่แล้วเขียน Supabase
export async function createOrder({ userId, items, ship }) {
  if (apiEnabled) {
    const { order } = await api.post('/api/orders', { items: items.map((i) => ({ slug: i.slug, qty: i.qty })), ship })
    return order
  }
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const slugs = items.map((i) => i.slug)
  const { data: prods, error: e1 } = await supabase.from('products').select('id,slug,name,price,sale_price,stock').in('slug', slugs)
  if (e1) throw e1
  const bySlug = Object.fromEntries((prods || []).map((p) => [p.slug, p]))
  const priceOf = (p) => (p.sale_price && p.sale_price < p.price ? p.sale_price : p.price)
  const lines = items.filter((i) => bySlug[i.slug]).map((i) => {
    const p = bySlug[i.slug]
    return { product_id: p.id, name: p.name, price: priceOf(p), qty: i.qty }
  })
  if (!lines.length) throw new Error(tOutside('common.emptyCart'))
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const total = subtotal + (subtotal >= 1500 ? 0 : 80)
  const { data: order, error: e2 } = await supabase.from('orders').insert({
    user_id: userId, total, status: 'pending', payment_method: 'promptpay',
    ship_name: ship.name, ship_phone: ship.phone, ship_address: ship.address,
  }).select().single()
  if (e2) throw e2
  const { error: e3 } = await supabase.from('order_items').insert(lines.map((l) => ({ ...l, order_id: order.id })))
  if (e3) throw e3
  return order
}

export async function fetchOrderByCode(code) {
  if (!code) return null
  if (apiEnabled) {
    try { return (await api.get(`/api/orders/track/${encodeURIComponent(code)}`)).order }
    catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e }
  }
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('code', code).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchMyOrders(userId) {
  if (apiEnabled) return (await api.get('/api/orders')).items
  if (!isSupabaseConfigured || !userId) return []
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ===================== ADMIN (โหมด API: requireAdmin ผ่าน cookie · fallback: RLS is_admin()) =====================
export async function adminListProducts() {
  if (apiEnabled) return (await api.get('/api/admin/products')).items
  const { data, error } = await supabase.from('products')
    .select('*, categories(slug,name_th), brands(slug,name)').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function saveProduct(p) {
  const row = {
    id: p.id, name: p.name, slug: p.slug, category_id: p.category_id || null, brand_id: p.brand_id || null,
    price: Number(p.price) || 0,
    old_price: p.old_price ? Number(p.old_price) : null,
    sale_price: p.sale_price ? Number(p.sale_price) : null,
    stock: Number(p.stock) || 0, badge: p.badge || null,
    images: p.images || [], specs: p.specs || {}, attrs: p.attrs || {}, description: p.description || null,
    is_active: p.is_active !== false, is_featured: !!p.is_featured,
  }
  if (apiEnabled) { await api.post('/api/admin/products', row); return }
  const { id, ...rest } = row
  const res = id ? await supabase.from('products').update(rest).eq('id', id) : await supabase.from('products').insert(rest)
  if (res.error) throw res.error
}
export async function deleteProduct(id) {
  if (apiEnabled) { await api.del(`/api/admin/products/${id}`); return }
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function adminListSlides() {
  if (apiEnabled) return (await api.get('/api/admin/slides')).items
  const { data, error } = await supabase.from('slides').select('*').order('placement').order('sort')
  if (error) throw error
  return data || []
}
export async function saveSlide(s) {
  const row = {
    id: s.id, placement: s.placement, title: s.title || null, image_url: s.image_url || null,
    link: s.link || null, sort: Number(s.sort) || 0, is_active: s.is_active !== false,
  }
  if (apiEnabled) { await api.post('/api/admin/slides', row); return }
  const { id, ...rest } = row
  const res = id ? await supabase.from('slides').update(rest).eq('id', id) : await supabase.from('slides').insert(rest)
  if (res.error) throw res.error
}
export async function deleteSlide(id) {
  if (apiEnabled) { await api.del(`/api/admin/slides/${id}`); return }
  const { error } = await supabase.from('slides').delete().eq('id', id)
  if (error) throw error
}

export async function adminListOrders() {
  if (apiEnabled) return (await api.get('/api/admin/orders')).items
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
// อัปเดตออเดอร์ (สถานะ/เลขพัสดุ/ขนส่ง) - โหมด API ตัด-คืนสต็อกให้ที่ backend
export async function updateOrder(id, patch) {
  if (apiEnabled) { await api.patch(`/api/admin/orders/${id}`, patch); return }
  const { error } = await supabase.from('orders').update(patch).eq('id', id)
  if (error) throw error
}
// เผื่อโค้ดเก่าเรียก - map ไป updateOrder
export const updateOrderStatus = (id, status) => updateOrder(id, { status })

export async function adminListCustomers() {
  if (apiEnabled) return (await api.get('/api/admin/customers')).items
  const [{ data: profs, error }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('id,email,full_name,phone,role,created_at').order('created_at', { ascending: false }),
    supabase.from('orders').select('user_id,total,status'),
  ])
  if (error) throw error
  const PAID = new Set(['paid', 'packing', 'shipping', 'done'])
  const stat = {}
  for (const o of orders || []) {
    if (!o.user_id) continue
    const s = (stat[o.user_id] ||= { orders: 0, spent: 0 })
    s.orders += 1
    if (PAID.has(o.status)) s.spent += o.total || 0
  }
  return (profs || []).map((p) => ({ ...p, orders_count: stat[p.id]?.orders ?? 0, lifetime_value: stat[p.id]?.spent ?? 0 }))
}

// ลูกค้ายกเลิก/ขอยกเลิกออเดอร์ของตัวเอง
export async function cancelOrder(id, reason) {
  if (apiEnabled) return (await api.post(`/api/orders/${id}/cancel`, { reason })).status
  const { data: order, error: e0 } = await supabase.from('orders').select('id,status').eq('id', id).maybeSingle()
  if (e0) throw e0
  if (!order) throw new Error(tOutside('track.notFound'))
  if (order.status === 'pending') {
    const { error } = await supabase.from('orders').update({ status: 'cancel', cancel_reason: reason || null, canceled_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    return 'cancel'
  }
  if (order.status === 'paid' || order.status === 'packing') {
    const { error } = await supabase.from('orders').update({ status: 'cancel_requested', cancel_reason: reason || null }).eq('id', id)
    if (error) throw error
    return 'cancel_requested'
  }
  throw new Error(tOutside('orders.cannotCancel'))
}

export async function fetchSetting(key) {
  if (apiEnabled) return (await api.get(`/api/settings/${encodeURIComponent(key)}`)).value
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return data?.value || null
}
export async function saveSetting(key, value) {
  if (apiEnabled) { await api.put(`/api/admin/settings/${encodeURIComponent(key)}`, { value }); return }
  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

export async function adminStats() {
  if (apiEnabled) {
    const { products, orders, revenue } = await api.get('/api/admin/stats')
    return { products, orders, revenue }
  }
  const [pc, oc, rev] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total'),
  ])
  const revenue = (rev.data || []).reduce((s, o) => s + (o.total || 0), 0)
  return { products: pc.count || 0, orders: oc.count || 0, revenue }
}

const SELECT = '*, categories!inner(slug,name_th,name_en), brands!inner(name,slug)'

export async function fetchProducts({ cat, brand, featured, limit } = {}) {
  if (apiEnabled) {
    return (await api.get('/api/catalog/products' + qs({ cat, brand, featured: featured ? 'true' : undefined, limit }))).items
  }
  if (!isSupabaseConfigured) {
    let items = MOCK_PRODUCTS
    if (cat) items = items.filter((p) => p.cat === cat)
    if (brand) items = items.filter((p) => p.brand === brand)
    if (featured) items = items.filter((p) => p.featured)
    if (limit) items = items.slice(0, Number(limit))
    return items
  }
  let q = supabase.from('products').select(SELECT).eq('is_active', true)
  if (cat) q = q.eq('categories.slug', cat)
  if (brand) q = q.eq('brands.slug', brand)
  if (featured) q = q.eq('is_featured', true)
  q = q.order('created_at', { ascending: true })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(mapProduct)
}

export async function fetchProductBySlug(slug) {
  if (apiEnabled) {
    try { return (await api.get(`/api/catalog/products/${encodeURIComponent(slug)}`)).item }
    catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e }
  }
  if (!isSupabaseConfigured) return MOCK_PRODUCTS.find((p) => p.slug === slug) || null
  const { data, error } = await supabase.from('products').select(SELECT).eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? mapProduct(data) : null
}

// ===================== REVIEWS (รีวิวจริงจากตาราง reviews) =====================
export async function fetchReviews(slug) {
  if (apiEnabled) return (await api.get(`/api/catalog/products/${encodeURIComponent(slug)}/reviews`)).items
  if (!isSupabaseConfigured) return []
  const { data: prod } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle()
  if (!prod) return []
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess?.session?.user?.id || null
  const { data, error } = await supabase.from('reviews')
    .select('id,user_id,rating,comment,author_name,verified,created_at')
    .eq('product_id', prod.id).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.id, rating: r.rating, comment: r.comment, author_name: r.author_name,
    verified: !!r.verified, created_at: r.created_at, mine: !!uid && r.user_id === uid,
  }))
}

export async function saveReview(slug, { rating, comment }) {
  if (apiEnabled) { await api.post(`/api/catalog/products/${encodeURIComponent(slug)}/reviews`, { rating, comment }); return }
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const { data: sess } = await supabase.auth.getSession()
  const user = sess?.session?.user
  if (!user) throw new Error(tOutside('orders.loginToView'))
  const { data: prod } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle()
  if (!prod) throw new Error(tOutside('notfound.title'))
  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const author = prof?.full_name || (user.email ? user.email.split('@')[0] : null)
  const { data: bought } = await supabase.from('orders')
    .select('id, order_items!inner(product_id)')
    .eq('order_items.product_id', prod.id)
    .in('status', ['paid', 'packing', 'shipping', 'done']).limit(1)
  const { error } = await supabase.from('reviews').upsert(
    { product_id: prod.id, user_id: user.id, rating, comment: comment?.trim() || null, author_name: author, verified: !!(bought && bought.length) },
    { onConflict: 'product_id,user_id' }
  )
  if (error) throw error
}

export async function deleteReview(slug) {
  if (apiEnabled) { await api.del(`/api/catalog/products/${encodeURIComponent(slug)}/reviews`); return }
  const { data: sess } = await supabase.auth.getSession()
  const user = sess?.session?.user
  if (!user) return
  const { data: prod } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle()
  if (!prod) return
  const { error } = await supabase.from('reviews').delete().eq('product_id', prod.id).eq('user_id', user.id)
  if (error) throw error
}

// ===================== ADMIN: BRANDS / CATEGORIES =====================
export async function saveBrand(b) {
  const row = { id: b.id, slug: b.slug, name: b.name, logo_url: b.logo_url || null, sort: Number(b.sort) || 0 }
  if (apiEnabled) { await api.post('/api/admin/brands', row); return }
  const { id, ...rest } = row
  const res = id ? await supabase.from('brands').update(rest).eq('id', id) : await supabase.from('brands').insert(rest)
  if (res.error) throw res.error
}
export async function deleteBrand(id) {
  if (apiEnabled) { await api.del(`/api/admin/brands/${id}`); return }
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) throw error
}
export async function saveCategory(g) {
  const row = { id: g.id, slug: g.slug, name_th: g.name_th, name_en: g.name_en, icon: g.icon || null, sort: Number(g.sort) || 0 }
  if (apiEnabled) { await api.post('/api/admin/categories', row); return }
  const { id, ...rest } = row
  const res = id ? await supabase.from('categories').update(rest).eq('id', id) : await supabase.from('categories').insert(rest)
  if (res.error) throw res.error
}
export async function deleteCategory(id) {
  if (apiEnabled) { await api.del(`/api/admin/categories/${id}`); return }
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ===================== PC BUILDER =====================
// นิยามแอตทริบิวต์ต่อหมวด (ใช้ใน builder + ฟอร์มสินค้า admin)
export async function fetchAttributeDefs(cat) {
  if (apiEnabled) return (await api.get('/api/catalog/attribute-defs' + qs({ cat }))).items
  if (!isSupabaseConfigured) return []
  let q = supabase.from('attribute_defs')
    .select('id,category_id,key,label_th,label_en,type,unit,options,required_for_compat,show_in_specs,sort,categories!inner(slug)')
    .order('sort', { ascending: true })
  if (cat) q = q.eq('categories.slug', cat)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((d) => ({ ...d, cat: d.categories?.slug, categories: undefined }))
}

// สเปคที่บันทึก (builds) - โหมด API ผ่าน backend · fallback เขียน Supabase ตรง (RLS own-row)
const BUILD_SELECT = 'id,name,share_code,items,budget,is_public,created_at,updated_at'
async function fallbackUid() {
  const { data } = await supabase.auth.getSession()
  const uid = data?.session?.user?.id
  if (!uid) throw new Error(tOutside('builder.needLogin'))
  return uid
}
export async function listMyBuilds() {
  if (apiEnabled) return (await api.get('/api/builder/builds')).items
  await fallbackUid()
  const { data, error } = await supabase.from('builds').select(BUILD_SELECT).order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function createBuild({ name, items, budget, is_public }) {
  if (apiEnabled) return (await api.post('/api/builder/builds', { name, items, budget: budget ?? null, is_public: !!is_public })).build
  const uid = await fallbackUid()
  const { data, error } = await supabase.from('builds')
    .insert({ user_id: uid, name, items, budget: budget ?? null, is_public: !!is_public }).select(BUILD_SELECT).single()
  if (error) throw error
  return data
}
export async function updateBuild(id, patch) {
  if (apiEnabled) return (await api.patch(`/api/builder/builds/${id}`, patch)).build
  await fallbackUid()
  const { data, error } = await supabase.from('builds').update(patch).eq('id', id).select(BUILD_SELECT).single()
  if (error) throw error
  return data
}
export async function deleteBuild(id) {
  if (apiEnabled) { await api.del(`/api/builder/builds/${id}`); return }
  await fallbackUid()
  const { error } = await supabase.from('builds').delete().eq('id', id)
  if (error) throw error
}
export async function duplicateBuild(id) {
  if (apiEnabled) return (await api.post(`/api/builder/builds/${id}/duplicate`)).build
  const uid = await fallbackUid()
  const { data: src, error } = await supabase.from('builds').select('name,items,budget').eq('id', id).maybeSingle()
  if (error) throw error
  if (!src) throw new Error(tOutside('builder.sharedNotFound'))
  const { data, error: e2 } = await supabase.from('builds')
    .insert({ user_id: uid, name: (src.name + ' (สำเนา)').slice(0, 60), items: src.items, budget: src.budget })
    .select(BUILD_SELECT).single()
  if (e2) throw e2
  return data
}
export async function fetchSharedBuild(code) {
  if (apiEnabled) {
    try { return (await api.get(`/api/builder/shared/${encodeURIComponent(code)}`)).build }
    catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e }
  }
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.from('builds')
    .select('name,items,budget,updated_at').eq('share_code', code).eq('is_public', true).maybeSingle()
  if (error) throw error
  return data
}

// สเปคสาธารณะจากชุมชน (ดูของคนอื่น) พร้อม summary (ราคา/จำนวนชิ้น/รูป) - แบ่งหน้า
export async function fetchCommunityBuilds({ limit = 24, offset = 0 } = {}) {
  if (apiEnabled) return await api.get('/api/builder/community' + qs({ limit, offset }))
  if (!isSupabaseConfigured) return { items: [], total: 0 }
  const { data, error, count } = await supabase.from('builds')
    .select('share_code,name,author_name,budget,updated_at,items', { count: 'exact' })
    .eq('is_public', true).order('updated_at', { ascending: false }).range(offset, offset + limit - 1)
  if (error) throw error
  const builds = data || []
  const slugs = [...new Set(builds.flatMap((b) => (b.items || []).map((i) => i.id)))]
  const priceMap = {}
  if (slugs.length) {
    const { data: prods } = await supabase.from('products').select('slug,price,sale_price,images').in('slug', slugs)
    for (const p of prods || []) {
      const imgs = Array.isArray(p.images) ? p.images : []
      priceMap[p.slug] = { price: p.price, sale: p.sale_price, img: imgs[0] || null }
    }
  }
  const items = builds.map((b) => {
    let total = 0, parts = 0
    const thumbs = []
    for (const it of b.items || []) {
      const p = priceMap[it.id]; const q = it.qty || 1
      parts += q
      if (p) { total += (p.sale && p.sale < p.price ? p.sale : p.price) * q; if (p.img && thumbs.length < 4) thumbs.push(p.img) }
    }
    return { share_code: b.share_code, name: b.name, author_name: b.author_name || null, budget: b.budget || null, updated_at: b.updated_at, parts, total, thumbs }
  })
  return { items, total: count || items.length }
}

export async function fetchSlides(placement) {
  if (apiEnabled) return (await api.get('/api/catalog/slides' + qs({ placement }))).items
  if (!isSupabaseConfigured) return []
  let q = supabase.from('slides').select('*').eq('is_active', true).order('sort', { ascending: true })
  if (placement) q = q.eq('placement', placement)
  const { data, error } = await q
  if (error) throw error
  const seen = new Set()
  return (data || []).filter((s) => {
    const k = `${s.image_url}|${s.title}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
