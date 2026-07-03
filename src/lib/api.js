import { supabase, isSupabaseConfigured } from './supabase'
import { api, apiEnabled, ApiError } from './apiClient'
import { tOutside } from '../i18n/translations'

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
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('brands').select('*').order('sort', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchCategories() {
  if (apiEnabled) return (await api.get('/api/catalog/categories')).items
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('categories').select('*').order('sort', { ascending: true })
  if (error) throw error
  return data || []
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
    images: p.images || [], specs: p.specs || {}, description: p.description || null,
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
export async function updateOrderStatus(id, status) {
  if (apiEnabled) { await api.patch(`/api/admin/orders/${id}/status`, { status }); return }
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
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
  if (!isSupabaseConfigured) return []
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
  if (!isSupabaseConfigured) return null
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
