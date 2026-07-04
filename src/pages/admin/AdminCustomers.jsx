import { useMemo, useState } from 'react'
import { fmt } from '../../data/mock'
import { cx } from '../../lib/ui'
import { adminListCustomers } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useLang } from '../../i18n/LanguageContext'
import { TableSkeleton } from '../../components/Skeleton'

export default function AdminCustomers() {
  const { t, lang } = useLang()
  const { data, loading } = useFetch(() => adminListCustomers(), [])
  const [q, setQ] = useState('')
  const rows = data || []

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((c) => [c.full_name, c.email, c.phone].filter(Boolean).some((v) => v.toLowerCase().includes(needle)))
  }, [rows, q])

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' }) : '-'

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{t('admin.customersTitle')} ({filtered.length})</h3>
        <input className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder={t('admin.searchCustomers')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="mb-4 text-sm text-muted">{t('admin.customersDesc')}</p>

      {loading ? <TableSkeleton rows={6} /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-10 text-center text-muted">{t('admin.noCustomers')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">{t('admin.colCustomer')}</th>
                <th className="px-4 py-3">{t('admin.colContact')}</th>
                <th className="px-4 py-3 text-center">{t('admin.colOrdersCount')}</th>
                <th className="px-4 py-3 text-right">{t('admin.colSpent')}</th>
                <th className="px-4 py-3">{t('admin.colJoined')}</th>
                <th className="px-4 py-3">{t('admin.colRole')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{(c.full_name || c.email || '?').trim().charAt(0).toUpperCase()}</span>
                      <span className="font-semibold">{c.full_name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <div>{c.email || '-'}</div>
                    {c.phone && <div className="text-xs">{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-center nums">{fmt(c.orders_count || 0)}</td>
                  <td className="px-4 py-3 text-right"><b className="nums text-brand-600">฿{fmt(c.lifetime_value || 0)}</b></td>
                  <td className="px-4 py-3 text-muted">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', c.role === 'admin' ? 'bg-brand-600/15 text-brand-600' : 'bg-zinc-500/15 text-zinc-500')}>
                      {c.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleCustomer')}
                    </span>
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
