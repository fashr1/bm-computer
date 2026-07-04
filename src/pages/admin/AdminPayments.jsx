import { useMemo, useState } from 'react'
import { fmt } from '../../data/mock'
import { orderStatusCls, cx } from '../../lib/ui'
import { Icon } from '../../components/Icons'
import { adminListOrders, updateOrder } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useLang } from '../../i18n/LanguageContext'
import { TableSkeleton } from '../../components/Skeleton'

const PAID = ['paid', 'packing', 'shipping', 'done']

export default function AdminPayments() {
  const { t, lang } = useLang()
  const [key, setKey] = useState(0)
  const { data, loading } = useFetch(() => adminListOrders(), [key])
  const [busy, setBusy] = useState(null)
  const [filter, setFilter] = useState('all')
  const rows = data || []
  const label = (s) => t(`orders.status.${s}`)

  const sums = useMemo(() => {
    let paid = 0, pending = 0, refunded = 0
    for (const o of rows) {
      if (PAID.includes(o.status)) paid += o.total || 0
      else if (o.status === 'pending' || o.status === 'cancel_requested') pending += o.total || 0
      else if (o.status === 'refunded') refunded += o.total || 0
    }
    return { paid, pending, refunded }
  }, [rows])

  const filtered = useMemo(() => rows.filter((o) => {
    if (filter === 'paid') return PAID.includes(o.status)
    if (filter === 'pending') return o.status === 'pending'
    if (filter === 'refund') return o.status === 'refunded' || o.status === 'cancel_requested'
    return true
  }), [rows, filter])

  const refund = async (id) => {
    if (!confirm(t('admin.approveRefund') + ' ?')) return
    setBusy(id)
    try { await updateOrder(id, { status: 'refunded' }); setKey((k) => k + 1) } catch (e) { alert(`${t('admin.updateFail')}: ${e.message}`) } finally { setBusy(null) }
  }
  const fmtDate = (iso) => new Date(iso).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const cards = [
    { icon: 'card', label: t('admin.sumPaid'), value: sums.paid, cls: 'text-emerald-600' },
    { icon: 'clock', label: t('admin.sumPending'), value: sums.pending, cls: 'text-amber-600' },
    { icon: 'rotateCcw', label: t('admin.sumRefunded'), value: sums.refunded, cls: 'text-purple-600' },
  ]
  const filters = [['all', t('admin.orderFilterAll')], ['paid', t('admin.payFilterPaid')], ['pending', t('admin.payFilterPending')], ['refund', t('admin.payFilterRefund')]]

  return (
    <div>
      <h3 className="mb-1 font-bold">{t('admin.paymentsTitle')}</h3>
      <p className="mb-4 text-sm text-muted">{t('admin.paymentsDesc')}</p>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-1.5 flex items-center gap-2 text-sm text-muted"><Icon name={c.icon} size={16} /> {c.label}</div>
            <div className={cx('nums text-2xl font-bold', c.cls)}>฿{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map(([f, lbl]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cx('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer', filter === f ? 'bg-brand-600 text-white' : 'border border-line bg-surface hover:bg-surface2')}>
            {lbl}
          </button>
        ))}
      </div>

      {loading ? <TableSkeleton rows={6} /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-10 text-center text-muted">{t('admin.noPayments')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">{t('admin.colOrder')}</th>
                <th className="px-4 py-3">{t('admin.colDate')}</th>
                <th className="px-4 py-3">{t('admin.colMethod')}</th>
                <th className="px-4 py-3 text-right">{t('admin.colAmount')}</th>
                <th className="px-4 py-3">{t('admin.colPayStatus')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">#{o.code}<div className="text-xs font-normal text-muted">{o.ship_name || '-'}</div></td>
                  <td className="px-4 py-3 text-muted">{fmtDate(o.paid_at || o.created_at)}</td>
                  <td className="px-4 py-3 text-muted">{o.payment_method || 'promptpay'}</td>
                  <td className="px-4 py-3 text-right"><b className="nums text-brand-600">฿{fmt(o.total)}</b></td>
                  <td className="px-4 py-3"><span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', orderStatusCls[o.status])}>{label(o.status)}</span></td>
                  <td className="px-4 py-3 text-right">
                    {(PAID.includes(o.status) || o.status === 'cancel_requested') && (
                      <button disabled={busy === o.id} onClick={() => refund(o.id)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface2 disabled:opacity-60 cursor-pointer">{t('admin.approveRefund')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
