import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { Icon, IconGoogle } from './components/Icons'
import { useLang } from './i18n/LanguageContext'
import { useAuth } from './auth/AuthContext'

import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderTracking from './pages/OrderTracking'
import OrderHistory from './pages/OrderHistory'
import PCBuilder from './pages/PCBuilder'
import CommunityBuilds from './pages/CommunityBuilds'
import AuthPage from './pages/AuthPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCatalog from './pages/admin/AdminCatalog'
import AdminSlides from './pages/admin/AdminSlides'
import AdminOrders from './pages/admin/AdminOrders'
import AdminPayments from './pages/admin/AdminPayments'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminSettings from './pages/admin/AdminSettings'
import AccountLayout from './pages/account/AccountLayout'
import Profile from './pages/account/Profile'
import ProfilePage from './pages/ProfilePage'
import AccountOrders from './pages/account/AccountOrders'
import AccountTrack from './pages/account/AccountTrack'
import Addresses from './pages/account/Addresses'
import TaxProfiles from './pages/account/TaxProfiles'
import PaymentMethods from './pages/account/PaymentMethods'
import Wishlist from './pages/account/Wishlist'
import NotFound from './pages/NotFound'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

// overlay ตอนกลับมาจากหน้า Google OAuth: ให้เห็นสถานะ "กำลังเข้าสู่ระบบ" ชัดเจน
// (แทนการเห็นหน้าเว็บสถานะยังไม่ล็อกอินแวบหนึ่งแล้วค่อยเปลี่ยน)
function GoogleSignInOverlay() {
  const { t } = useLang()
  const { oauthPending } = useAuth()
  if (!oauthPending) return null
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-bg/80 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-10 py-8 shadow-2xl">
        <div className="relative grid h-16 w-16 place-items-center">
          <Icon name="loader" size={64} strokeWidth={1.2} className="spinner absolute inset-0 text-brand-600" />
          <IconGoogle size={26} />
        </div>
        <div className="text-center">
          <div className="font-bold">{t('auth.googleSigningIn')}</div>
          <div className="mt-1 text-sm text-muted">{t('auth.googleWait')}</div>
        </div>
      </div>
    </div>
  )
}

// เปลือกหน้าร้าน (topbar + Navbar + Footer) - ครอบทุกหน้าฝั่งลูกค้าผ่าน <Outlet/>
// หน้า /admin ไม่ใช้เปลือกนี้ (มี AdminLayout เต็มหน้า + sidebar ของตัวเอง)
function StorefrontShell() {
  const { t } = useLang()
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <div className="flex items-center justify-center gap-2 bg-zinc-900 px-4 py-1.5 text-center text-xs text-zinc-400">
        <Icon name="truck" size={14} className="shrink-0 text-brand-400" />
        {t('common.topbar')}
      </div>
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <>
      <GoogleSignInOverlay />
      <ScrollTop />
      <Routes>
        {/* Admin: เลย์เอาต์เต็มหน้าแยกจากหน้าร้าน (sidebar เปลี่ยนทุกหน้า) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="slides" element={<AdminSlides />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        {/* หน้าร้าน */}
        <Route element={<StorefrontShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<AuthPage view="login" />} />
          <Route path="/register" element={<AuthPage view="register" />} />
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
          <Route path="/builder" element={<PCBuilder />} />
          <Route path="/community" element={<CommunityBuilds />} />
          <Route path="/community/:code" element={<CommunityBuilds />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<Profile />} />
            <Route path="orders" element={<AccountOrders />} />
            <Route path="track" element={<AccountTrack />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="tax" element={<TaxProfiles />} />
            <Route path="payment" element={<PaymentMethods />} />
            <Route path="wishlist" element={<Wishlist />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
