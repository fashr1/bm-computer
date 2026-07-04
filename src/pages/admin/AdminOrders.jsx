import { useMemo, useState } from 'react'
import { fmt } from '../../data/mock'
import { orderStatusCls, orderStatusAll, cx } from '../../lib/ui'
import { Icon } from '../../components/Icons'
import { adminListOrders, updateOrder } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useLang } from '../../i18n/LanguageContext'
import { OrderListSkeleton } from '../../components/Skeleton'

const input = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none'

export default function AdminOrders() {
  const { t, lang } = useLang()
  const [key, setKey] = useState(0)
  const { data, loading } = useFetch(() => adminListOrders(), [key])
  const [busy, setBusy] = useState(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const rows = data || []
  const label = (s) => t(`orders.status.${s}`)
  const reload = () => setKey((k) => k + 1)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false
      if (!needle) return true
      return [o.code, o.ship_name, o.ship_phone].filter(Boolean).some((v) => v.toLowerCase().includes(needle))
    })
  }, [rows, filter, q])

  const act = async (id, patch) => {
    setBusy(id)
    try { await updateOrder(id, patch); reload() } catch (e) { alert(`${t('admin.updateFail')}: ${e.message}`) } finally { setBusy(null) }
  }
  const fmtDate = (iso) => new Date(iso).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const filters = ['all', ...orderStatusAll]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{t('admin.manageOrders')} ({filtered.length})</h3>
        <input className={input} placeholder={t('admin.searchOrders')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cx('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              filter === f ? 'bg-brand-600 text-white' : 'border border-line bg-surface hover:bg-surface2')}>
            {f === 'all' ? t('admin.orderFilterAll') : label(f)}
          </button>
        ))}
      </div>

      {loading ? <OrderListSkeleton /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-10 text-center text-muted">{t('admin.noOrders')}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} o={o} busy={busy === o.id} act={act} label={label} fmtDate={fmtDate} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ o, busy, act, label, fmtDate, t }) {
  const [track, setTrack] = useState(o.tracking_no || '')
  const [courier, setCourier] = useState(o.courier || '')
  const isCancelReq = o.status === 'cancel_requested'

  return (
    <div className={cx('rounded-xl border bg-surface p-4', isCancelReq ? 'border-orange-400' : 'border-line')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <b>#{o.code}</b>
          <span className={cx('ml-1 rounded-full px-2 py-0.5 text-xs font-semibold', orderStatusCls[o.status])}>{label(o.status)}</span>
          {isCancelReq && <span className="ml-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-600">{t('admin.cancelReqBadge')}</span>}
          <div className="mt-0.5 text-sm text-muted">{fmtDate(o.created_at)} · {(o.order_items || []).length} {t('admin.itemsShort')} · {o.ship_name || '-'} {o.ship_phone || ''}</div>
        </div>
        <div className="flex items-center gap-3">
          <b className="nums text-brand-600">฿{fmt(o.total)}</b>
          <select disabled={busy} value={o.status} onChange={(e) => act(o.id, { status: e.target.value })} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm cursor-pointer">
            {orderStatusAll.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
      </div>

      {o.ship_address && <div className="mt-2 border-t border-line pt-2 text-sm text-muted">{o.ship_address}</div>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(o.order_items || []).map((it) => <span key={it.id}>{it.name} ×{it.qty}</span>)}
      </div>

      {o.cancel_reason && <div className="mt-2 rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">“{o.cancel_reason}”</div>}

      {/* คำขอยกเลิกจากลูกค้า -> อนุมัติคืนเงิน / ปฏิเสธ */}
      {isCancelReq && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          <button disabled={busy} onClick={() => act(o.id, { status: 'refunded' })} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 cursor-pointer">{t('admin.approveRefund')}</button>
          <button disabled={busy} onClick={() => act(o.id, { status: 'paid' })} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-surface2 disabled:opacity-60 cursor-pointer">{t('admin.rejectCancel')}</button>
        </div>
      )}

      {/* ข้อมูลจัดส่ง (เลขพัสดุ + ขนส่ง) */}
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Icon name="truck" size={15} /> {t('admin.shippingInfo')}</div>
        <input className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm" placeholder={t('admin.trackingNo')} value={track} onChange={(e) => setTrack(e.target.value)} />
        <input className="w-32 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm" placeholder={t('admin.courierName')} value={courier} onChange={(e) => setCourier(e.target.value)} />
        <button disabled={busy} onClick={() => act(o.id, { tracking_no: track || null, courier: courier || null })} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface2 disabled:opacity-60 cursor-pointer">{t('admin.saveShipping')}</button>
      </div>
    </div>
  )
}
