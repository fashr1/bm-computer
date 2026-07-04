import { Link } from 'react-router-dom'
import { fmt } from '../../data/mock'
import { Icon } from '../../components/Icons'
import { orderStatusCls, cx } from '../../lib/ui'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../auth/AuthContext'
import { fetchMyOrders } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { OrderListSkeleton } from '../../components/Skeleton'
import { PageHead, EmptyState, PrimaryBtn } from './ui'

export default function AccountOrders() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { data, loading } = useFetch(() => (user ? fetchMyOrders(user.id) : Promise.resolve([])), [user?.id])
  const orders = data || []
  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' })
    : ''

  return (
    <div>
      <PageHead title={t('orders.title')} />
      {loading ? (
        <OrderListSkeleton />
      ) : orders.length === 0 ? (
        <>
          <EmptyState icon="receipt" text={t('orders.empty')} />
          <div className="mt-4 flex justify-center">
            <Link to="/products"><PrimaryBtn>{t('orders.shopNow')}</PrimaryBtn></Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <b>#{o.code}</b>{' '}
                  <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusCls[o.status])}>
                    {t(`orders.status.${o.status}`)}
                  </span>
                  <div className="text-sm text-muted">
                    {fmtDate(o.created_at)} · {(o.order_items || []).length} {t('orders.items')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted">{t('orders.totalLabel')}</div>
                    <b className="nums text-brand-600">฿{fmt(o.total)}</b>
                  </div>
                  <Link to={`/account/track?order=${o.code}`}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface2">
                    {t('orders.detail')}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
