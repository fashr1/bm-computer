import { api } from './apiClient'

// ---- Auth (ห่อ Supabase Auth ผ่าน backend + HttpOnly cookie) ----
export const authApi = {
  me: () => api.get('/api/auth/me'),
  login: (body) => api.post('/api/auth/login', body),
  register: (body) => api.post('/api/auth/register', body),
  logout: () => api.post('/api/auth/logout'),
  // นำ session จาก OAuth ฝั่ง client (Google) เข้าเป็น HttpOnly cookie
  session: (body) => api.post('/api/auth/session', body),
}

// ---- บัญชีของฉัน ----
export const accountApi = {
  getProfile: () => api.get('/api/account/profile'),
  updateProfile: (body) => api.patch('/api/account/profile', body),
  summary: () => api.get('/api/account/summary'),

  // ที่อยู่จัดส่ง
  listAddresses:  ()        => api.get('/api/account/addresses'),
  createAddress:  (b)       => api.post('/api/account/addresses', b),
  updateAddress:  (id, b)   => api.patch(`/api/account/addresses/${id}`, b),
  deleteAddress:  (id)      => api.del(`/api/account/addresses/${id}`),

  // ที่อยู่ใบกำกับภาษี
  listTax:        ()        => api.get('/api/account/tax-profiles'),
  createTax:      (b)       => api.post('/api/account/tax-profiles', b),
  updateTax:      (id, b)   => api.patch(`/api/account/tax-profiles/${id}`, b),
  deleteTax:      (id)      => api.del(`/api/account/tax-profiles/${id}`),

  // ช่องทางชำระเงิน
  listPayments:   ()        => api.get('/api/account/payment-methods'),
  createPayment:  (b)       => api.post('/api/account/payment-methods', b),
  updatePayment:  (id, b)   => api.patch(`/api/account/payment-methods/${id}`, b),
  deletePayment:  (id)      => api.del(`/api/account/payment-methods/${id}`),

  // สินค้าที่ถูกใจ
  listWishlist:   ()        => api.get('/api/account/wishlist'),
  addWishlist:    (slug)    => api.post('/api/account/wishlist', { slug }),
  removeWishlist: (slug)    => api.del(`/api/account/wishlist/${encodeURIComponent(slug)}`),
}
