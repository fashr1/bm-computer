import { Link } from 'react-router-dom'
import { fmt } from '../data/mock'
import { Icon } from '../components/Icons'
import { orderStatusCls, cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { useAuthNav } from '../auth/useAuthNav'
import { fetchMyOrders } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { OrderListSkeleton } from '../components/Skeleton'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'

export default function OrderHistory() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { open: openAuth } = useAuthNav()
  const { data, loading } = useFetch(() => (user ? fetchMyOrders(user.id) : Promise.resolve([])), [user?.id])
  const orders = data || []
  usePageMeta(t('orders.title'))
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' }) : ''

  return (
    <div className={`${wrap} py-6`}>
      <nav className="flex gap-1.5 py-3 text-sm text-muted"><Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> / <span className="text-fg">{t('orders.title')}</span></nav>
      <h1 className="mb-5 text-2xl font-bold">{t('orders.title')}</h1>

      {!user ? (
        <Empty icon="user" title={t('orders.loginToView')}><button onClick={() => openAuth('login')} className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer">{t('auth.signin')}</button></Empty>
      ) : loading ? (
        <OrderListSkeleton />
      ) : orders.length === 0 ? (
        <Empty icon="receipt" title={t('orders.empty')}><Link to="/products" className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700">{t('orders.shopNow')}</Link></Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <b>#{o.code}</b> <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusCls[o.status])}>{t(`orders.status.${o.status}`)}</span>
                  <div className="text-sm text-muted">{fmtDate(o.created_at)} · {(o.order_items || []).length} {t('orders.items')}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><div className="text-sm text-muted">{t('orders.totalLabel')}</div><b className="nums text-brand-600">฿{fmt(o.total)}</b></div>
                  <Link to={`/track?order=${o.code}`} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface2">{t('orders.detail')}</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Empty({ icon, title, children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-line bg-surface p-10 text-center shadow-xs">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400"><Icon name={icon} size={28} /></div>
      <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
      {children}
    </div>
  )
}
