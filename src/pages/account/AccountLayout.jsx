import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icons'
import { cx } from '../../lib/ui'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../auth/AuthContext'
import { useAuthNav } from '../../auth/useAuthNav'
import { accountApi } from '../../lib/accountApi'
import { apiEnabled } from '../../lib/apiClient'
import { usePageMeta } from '../../lib/usePageMeta'

function initials(name, email) {
  const src = (name || email || '?').trim()
  const parts = src.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?'
}

function SummaryCard({ value, label }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-5 text-center">
      <div className="nums text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  )
}

function SideLink({ to, end, icon, label }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => cx(
        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
        isActive ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-400' : 'text-fg hover:bg-surface2',
      )}>
      <Icon name={icon} size={18} /> {label}
    </NavLink>
  )
}

export default function AccountLayout() {
  const { t } = useLang()
  const { user, profile, loading } = useAuth()
  usePageMeta(t('account.title'))
  const { open: openAuth } = useAuthNav()
  const nav = useNavigate()
  const [summary, setSummary] = useState({ done: 0, shipping: 0, processing: 0, awaitingPayment: 0 })

  // กั้นสิทธิ์: ยังไม่ล็อกอิน -> เปิด modal แล้วกลับหน้าแรก
  useEffect(() => {
    if (!apiEnabled) { nav('/', { replace: true }); return }
    if (!loading && !user) { openAuth('login'); nav('/', { replace: true }) }
  }, [loading, user, openAuth, nav])

  useEffect(() => {
    if (!user) return
    let alive = true
    accountApi.summary().then((r) => { if (alive) setSummary(r.summary) }).catch(() => {})
    return () => { alive = false }
  }, [user])

  if (!user) return null

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      {/* header: การ์ดโปรไฟล์ + สรุปออเดอร์ 4 ใบ */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_2fr]">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-600 text-xl font-bold text-white">
            {initials(profile?.full_name, user.email)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{profile?.full_name || user.email}</div>
            <div className="truncate text-sm text-muted">{user.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard value={summary.done} label={t('account.done')} />
          <SummaryCard value={summary.shipping} label={t('account.shipped')} />
          <SummaryCard value={summary.processing} label={t('account.processing')} />
          <SummaryCard value={summary.awaitingPayment} label={t('account.awaitingPayment')} />
        </div>
      </div>

      {/* body: sidebar + เนื้อหา */}
      <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-surface p-3">
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('account.sectionList')}</div>
          <SideLink to="/orders" icon="receipt" label={t('account.myOrders')} />
          <SideLink to="/account/wishlist" icon="heart" label={t('account.wishlist')} />
          <SideLink to="/track" icon="truck" label={t('account.trackShipping')} />
          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">{t('account.sectionAccount')}</div>
          <SideLink to="/account" end icon="user" label={t('account.personalInfo')} />
          <SideLink to="/account/addresses" icon="pin" label={t('account.shippingAddress')} />
          <SideLink to="/account/tax" icon="doc" label={t('account.taxAddress')} />
          <SideLink to="/account/payment" icon="card" label={t('account.paymentMethods')} />
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
