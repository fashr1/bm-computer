import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icons'
import { cx } from '../../lib/ui'
import { useAuth } from '../../auth/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { useTheme } from '../../theme/ThemeContext'
import { usePageMeta } from '../../lib/usePageMeta'

// เมนู sidebar จัดกลุ่มตาม PRD (ร้านค้า / การขาย / ผู้คน / ระบบ)
const groups = [
  { label: 'admin.sectionShop', items: [
    { to: '/admin', end: true, icon: 'grid', label: 'admin.menuOverview' },
    { to: '/admin/products', icon: 'box', label: 'admin.menuProducts' },
    { to: '/admin/catalog', icon: 'cpu', label: 'admin.menuCatalog' },
    { to: '/admin/slides', icon: 'image', label: 'admin.menuSlides' },
  ] },
  { label: 'admin.sectionSales', items: [
    { to: '/admin/orders', icon: 'receipt', label: 'admin.menuOrders' },
    { to: '/admin/payments', icon: 'card', label: 'admin.menuPayments' },
  ] },
  { label: 'admin.sectionPeople', items: [
    { to: '/admin/customers', icon: 'users', label: 'admin.menuCustomers' },
  ] },
  { label: 'admin.sectionSystem', items: [
    { to: '/admin/settings', icon: 'wrench', label: 'admin.menuSettings' },
  ] },
]

export default function AdminLayout() {
  const { t } = useLang()
  const { user, profile, isAdmin, loading, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const [openNav, setOpenNav] = useState(false)
  usePageMeta(t('admin.adminPanel'))

  if (loading) return (
    <div className="grid min-h-dvh place-items-center bg-bg text-fg">
      <div className="flex items-center gap-3 text-muted"><Icon name="loader" size={22} className="spinner" /> {t('admin.checkingAuth')}</div>
    </div>
  )
  if (!user) return <Gate title={t('admin.loginTitle')} action={<Link to="/login?redirect=/admin" className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700">{t('auth.signin')}</Link>} />
  if (!isAdmin) return <Gate title={t('admin.noAccess')} desc={t('admin.noAccessDesc')} action={<Link to="/" className="inline-flex items-center justify-center rounded-xl border border-line px-6 py-3 font-semibold transition-colors hover:bg-surface2">{t('admin.backToShop')}</Link>} />

  const initial = (profile?.full_name || user.email || '?').trim().charAt(0).toUpperCase()

  const Sidebar = (
    <nav className="flex h-full flex-col gap-6 p-4">
      <Link to="/admin" className="flex items-center gap-2.5 px-2" onClick={() => setOpenNav(false)}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><Icon name="grid" size={20} /></span>
        <span className="font-extrabold tracking-wide">{t('admin.adminPanel')}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{t(g.label)}</div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end} onClick={() => setOpenNav(false)}
                  className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-fg hover:bg-surface2')}>
                  <Icon name={m.icon} size={18} /> {t(m.label)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link to="/" className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold hover:bg-surface2">
        <Icon name="truck" size={18} /> {t('admin.viewShop')}
      </Link>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-bg text-fg lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar (จอใหญ่: ติดซ้าย · มือถือ: drawer) */}
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">{Sidebar}</aside>
      {openNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenNav(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] border-r border-line bg-surface">{Sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-dvh flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur">
          <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface2 lg:hidden cursor-pointer" onClick={() => setOpenNav(true)} aria-label="menu"><Icon name="menu" /></button>
          <h1 className="text-lg font-bold">{t('admin.title')}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface2 cursor-pointer" aria-label="theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{initial}</span>
              <span className="hidden text-sm font-semibold sm:block">{profile?.full_name || user.email}</span>
            </div>
            <button onClick={() => { signOut(); nav('/') }} className="grid h-10 w-10 place-items-center rounded-lg text-brand-600 hover:bg-surface2 cursor-pointer" aria-label={t('nav.logout')} title={t('nav.logout')}><Icon name="logout" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}

function Gate({ title, desc, action }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-line bg-surface p-10 text-center shadow-xs">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400"><Icon name="lock" size={28} /></div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {desc && <p className="mt-1.5 text-sm text-muted">{desc}</p>}
        <div className="mt-5">{action}</div>
      </div>
    </div>
  )
}
