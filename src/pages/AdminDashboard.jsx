import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { cx } from '../lib/ui'
import { useAuth } from '../auth/AuthContext'
import { useAuthModal } from '../components/AuthModal'
import { useLang } from '../i18n/LanguageContext'
import AdminOverview from './admin/AdminOverview'
import AdminProducts from './admin/AdminProducts'
import AdminCatalog from './admin/AdminCatalog'
import AdminSlides from './admin/AdminSlides'
import AdminOrders from './admin/AdminOrders'
import AdminSettings from './admin/AdminSettings'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'
const menu = [
  { k: 'overview', icon: 'grid', label: 'admin.menuOverview' },
  { k: 'products', icon: 'box', label: 'admin.menuProducts' },
  { k: 'catalog', icon: 'grid', label: 'admin.menuCatalog' },
  { k: 'slides', icon: 'image', label: 'admin.menuSlides' },
  { k: 'orders', icon: 'receipt', label: 'admin.menuOrders' },
  { k: 'settings', icon: 'wrench', label: 'admin.menuSettings' },
]

export default function AdminDashboard() {
  const { t } = useLang()
  const { user, isAdmin, loading } = useAuth()
  const { open: openAuth } = useAuthModal()
  const [tab, setTab] = useState('overview')
  usePageMeta(t('admin.title'))

  if (loading) return (
    <div className={`${wrap} flex items-center justify-center gap-3 py-20 text-muted`}>
      <Icon name="loader" size={22} className="spinner" /> {t('admin.checkingAuth')}
    </div>
  )

  if (!user) return (
    <Guard title={t('admin.loginTitle')}><button onClick={() => openAuth('login')} className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer">{t('auth.signin')}</button></Guard>
  )
  if (!isAdmin) return (
    <Guard title={t('admin.noAccess')} desc={t('admin.noAccessDesc')}><Link to="/" className="mt-5 inline-flex items-center justify-center rounded-xl border border-line px-6 py-3 font-semibold transition-colors hover:bg-surface2">{t('admin.backToShop')}</Link></Guard>
  )

  return (
    <div className={`${wrap} py-6`}>
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t('admin.title')}</h1><p className="text-sm text-muted">{t('admin.sub')}</p></div>
        <Link to="/" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-surface2">{t('admin.backToShop')}</Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-3 lg:sticky lg:top-[150px] lg:flex-col">
          {menu.map((m) => (
            <button key={m.k} onClick={() => setTab(m.k)}
              className={cx('flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                tab === m.k ? 'bg-brand-50 text-brand-600 dark:bg-brand-600/15' : 'text-fg hover:bg-surface2')}>
              <Icon name={m.icon} size={18} /> {t(m.label)}
            </button>
          ))}
        </aside>

        <section>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'products' && <AdminProducts />}
          {tab === 'catalog' && <AdminCatalog />}
          {tab === 'slides' && <AdminSlides />}
          {tab === 'orders' && <AdminOrders />}
          {tab === 'settings' && <AdminSettings />}
        </section>
      </div>
    </div>
  )
}

function Guard({ title, desc, children }) {
  return (
    <div className={`${wrap} py-16`}>
      <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-line bg-surface p-10 text-center shadow-xs">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400"><Icon name="lock" size={28} /></div>
        <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
        {desc && <p className="mt-1.5 text-sm text-muted">{desc}</p>}
        {children}
      </div>
    </div>
  )
}
