import { useState } from 'react'
import { Icon } from './Icons'
import { cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { useAuthModal } from './AuthModal'
import { fetchReviews, saveReview, deleteReview } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { Skeleton } from './Skeleton'

// รีวิวจริงจากตาราง reviews: อ่านสาธารณะ · ล็อกอินแล้วเขียน/แก้/ลบของตัวเองได้ 1 รีวิวต่อสินค้า
// trigger ฝั่ง DB อัปเดต products.rating / reviews_count ให้เอง
export default function Reviews({ slug, fallbackRating }) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { open: openAuth } = useAuthModal()
  const [key, setKey] = useState(0)
  const { data, loading } = useFetch(() => fetchReviews(slug), [slug, key, user?.id])
  const items = data || []
  const mine = items.find((r) => r.mine)
  const avg = items.length ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1) : fallbackRating
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' })

  if (loading) return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
      {/* สรุปคะแนน + ฟอร์มเขียนรีวิว */}
      <aside className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <div className="text-center">
          <div className="nums text-4xl font-extrabold">{avg}</div>
          <div className="mt-1 text-amber-500">{'★'.repeat(Math.round(Number(avg) || 0)).padEnd(5, '☆')}</div>
          <div className="mt-1 text-sm text-muted">{items.length} {t('common.reviews')}</div>
        </div>
        {user ? (
          <ReviewForm slug={slug} mine={mine} onSaved={() => setKey((k) => k + 1)} />
        ) : (
          <button onClick={() => openAuth('login')}
            className="rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer">
            {t('pdp.loginToReview')}
          </button>
        )}
      </aside>

      {/* รายการรีวิว */}
      {items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-line bg-surface py-14 text-center text-muted">
          <Icon name="heart" size={28} />
          <span className="text-sm">{t('pdp.noReviews')}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className={cx('rounded-2xl border bg-surface p-4', r.mine ? 'border-brand-500/50' : 'border-line')}>
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">{r.author_name || t('pdp.anonymous')}</b>
                {r.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Icon name="check" size={11} /> {t('pdp.verifiedBuyer')}
                  </span>
                )}
                {r.mine && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-400">{t('pdp.myReview')}</span>}
                <span className="ml-auto text-xs text-muted">{fmtDate(r.created_at)}</span>
              </div>
              <div className="mt-1 text-sm text-amber-500">{'★'.repeat(r.rating)}<span className="text-line">{'★'.repeat(5 - r.rating)}</span></div>
              {r.comment && <p className="mt-1.5 text-sm text-muted">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewForm({ slug, mine, onSaved }) {
  const { t } = useLang()
  const [rating, setRating] = useState(mine?.rating || 0)
  const [comment, setComment] = useState(mine?.comment || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) { setErr(t('pdp.pickRating')); return }
    setBusy(true); setErr('')
    try { await saveReview(slug, { rating, comment }); onSaved() }
    catch (e2) { setErr(e2.message || t('common.error')) }
    finally { setBusy(false) }
  }
  const remove = async () => {
    if (!confirm(t('pdp.confirmDelReview'))) return
    setBusy(true); setErr('')
    try { await deleteReview(slug); setRating(0); setComment(''); onSaved() }
    catch (e2) { setErr(e2.message || t('common.error')) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-line pt-4">
      <b className="text-sm">{mine ? t('pdp.editReview') : t('pdp.writeReview')}</b>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t('pdp.yourRating')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => { setRating(n); setErr('') }} aria-label={`${n}`}
            className={cx('text-2xl transition-colors cursor-pointer', n <= rating ? 'text-amber-500' : 'text-line hover:text-amber-300')}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="3" maxLength={2000}
        placeholder={t('pdp.commentPh')}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
      {err && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">{err}</div>}
      <div className="flex gap-2">
        <button disabled={busy} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60 cursor-pointer">
          {busy ? t('common.loading') : mine ? t('pdp.updateReview') : t('pdp.submitReview')}
        </button>
        {mine && (
          <button type="button" onClick={remove} disabled={busy} title={t('pdp.deleteReview')}
            className="grid w-11 place-items-center rounded-xl border border-line text-brand-600 transition-colors hover:bg-surface2 disabled:opacity-60 cursor-pointer">
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>
    </form>
  )
}
