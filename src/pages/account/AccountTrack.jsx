import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fmt } from '../../data/mock'
import { Icon } from '../../components/Icons'
import { cx, orderStatusCls, orderFlow } from '../../lib/ui'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../auth/AuthContext'
import { fetchOrderByCode, cancelOrder } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { Skeleton, TextLinesSkeleton } from '../../components/Skeleton'
import { PageHead, EmptyState, PrimaryBtn } from './ui'

const CANCELLED_STATES = ['cancel', 'cancel_requested', 'refunded']

export default function AccountTrack() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const code = params.get('order')
  const [reloadKey, setReloadKey] = useState(0)
  const { data: order, loading } = useFetch(() => fetchOrderByCode(code), [code, user?.id, reloadKey])
  const [cancelOpen, setCancelOpen] = useState(false)

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : ''

  if (loading) return (
    <div aria-hidden="true" className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-36" /></div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="ml-2 flex flex-col gap-7">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-2xl border border-line bg-surface p-5">
        <Skeleton className="mb-4 h-5 w-32" />
        <TextLinesSkeleton lines={3} />
        <Skeleton className="mt-4 h-6 w-full" />
      </aside>
    </div>
  )

  if (!order) return (
    <div>
      <PageHead title={t('track.title')} />
      <EmptyState icon="receipt" text={t('track.notFound')} />
      <div className="mt-4 flex justify-center">
        <Link to="/account/orders"><PrimaryBtn>{t('track.viewHistory')}</PrimaryBtn></Link>
      </div>
    </div>
  )

  const idx = orderFlow.indexOf(order.status)
  const cancelled = CANCELLED_STATES.includes(order.status)
  const canCancel = user && ['pending', 'paid', 'packing'].includes(order.status)

  const doCancel = async (reason) => {
    await cancelOrder(order.id, reason)
    setCancelOpen(false)
    setReloadKey((k) => k + 1)
  }

  return (
    <div>
      <PageHead title={`${t('track.order')} #${order.code}`} />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted">{t('track.orderedOn')} {fmtDate(order.created_at)}</span>
            <span className={cx('rounded-full px-3 py-1 text-xs font-semibold', orderStatusCls[order.status])}>
              {t(`orders.status.${order.status}`)}
            </span>
          </div>

          {cancelled ? (
            <div className="rounded-xl bg-zinc-500/10 p-4 text-center text-muted">
              {t(`orders.status.${order.status}`)}
              {order.cancel_reason && <div className="mt-1 text-sm">"{order.cancel_reason}"</div>}
            </div>
          ) : (
            <ol className="relative ml-2">
              {orderFlow.map((st, i) => (
                <li key={st} className="relative pb-7 pl-8 last:pb-0">
                  <span className={cx('absolute left-0 top-1 h-4 w-4 rounded-full ring-4 ring-surface',
                    i < idx ? 'bg-emerald-500' : i === idx ? 'bg-brand-600' : 'bg-line')} />
                  {i < orderFlow.length - 1 && (
                    <span className={cx('absolute left-[7px] top-5 h-full w-0.5', i < idx ? 'bg-emerald-500' : 'bg-line')} />
                  )}
                  <b className={cx(i > idx && 'text-muted')}>{t(`orders.status.${st}`)}</b>
                </li>
              ))}
            </ol>
          )}

          {order.tracking_no && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-line bg-surface2 p-4 text-sm">
              <div><span className="text-muted">{t('orders.courier')}: </span><b>{order.courier || '-'}</b></div>
              <div><span className="text-muted">{t('orders.tracking')}: </span><b className="nums">{order.tracking_no}</b></div>
            </div>
          )}

          {order.ship_address && (
            <div className="mt-4 rounded-xl border border-line bg-surface2 p-4 text-sm">
              <div className="font-semibold">{order.ship_name} · {order.ship_phone}</div>
              <div className="text-muted">{order.ship_address}</div>
            </div>
          )}

          {canCancel && (
            <button onClick={() => setCancelOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-brand-600/10 cursor-pointer">
              <Icon name="x" size={15} />
              {order.status === 'pending' ? t('orders.cancelBtn') : t('orders.cancelReqBtn')}
            </button>
          )}
        </section>

        <aside className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="mb-3 font-bold">{t('checkout.yourOrder')}</h3>
          {(order.order_items || []).map((it) => (
            <div key={it.id} className="flex justify-between gap-2 py-1.5 text-sm text-muted">
              <span className="truncate">{it.name} ×{it.qty}</span>
              <span className="nums shrink-0 text-fg">฿{fmt(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between border-t border-line pt-4 text-lg font-bold">
            <span>{t('cart.total')}</span>
            <b className="nums text-brand-600">฿{fmt(order.total)}</b>
          </div>
          <Link to="/account/orders"
            className="mt-4 block rounded-xl border border-line py-2.5 text-center text-sm font-semibold hover:bg-surface2">
            {t('track.viewHistory')}
          </Link>
        </aside>
      </div>
      {cancelOpen && <CancelDialog order={order} onCancel={doCancel} onClose={() => setCancelOpen(false)} t={t} />}
    </div>
  )
}

function CancelDialog({ order, onCancel, onClose, t }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const isPaid = order.status !== 'pending'
  const submit = async () => {
    setBusy(true); setErr('')
    try { await onCancel(reason.trim() || undefined) } catch (e) { setErr(e.message || t('common.error')); setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <h3 className="text-lg font-bold">{t('orders.cancelTitle')} #{order.code}</h3>
        <p className="mt-1.5 text-sm text-muted">{isPaid ? t('orders.cancelPaidNote') : t('orders.cancelPendingNote')}</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t('orders.cancelReasonPh')}
          className="mt-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        {err && <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div className="mt-4 flex gap-2">
          <button disabled={busy} onClick={submit}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 cursor-pointer">
            {busy ? t('common.loading') : t('orders.cancelConfirm')}
          </button>
          <button disabled={busy} onClick={onClose}
            className="flex-1 rounded-xl border border-line py-2.5 font-semibold hover:bg-surface2 cursor-pointer">
            {t('orders.cancelKeep')}
          </button>
        </div>
      </div>
    </div>
  )
}
