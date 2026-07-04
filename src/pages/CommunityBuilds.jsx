import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { fmt } from '../data/mock'
import { Icon } from '../components/Icons'
import { cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { fetchCommunityBuilds } from '../lib/api'
import { Skeleton } from '../components/Skeleton'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'
const PAGE = 24

export default function CommunityBuilds() {
  const { code } = useParams()
  // /community/:code -> เปิดในหน้า builder (โหมดดูสเปคที่แชร์ ?b=)
  if (code) return <Navigate to={`/builder?b=${encodeURIComponent(code)}`} replace />
  return <CommunityList />
}

function CommunityList() {
  const { t, lang } = useLang()
  usePageMeta(t('community.title'), t('community.desc'))
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchCommunityBuilds({ limit: PAGE, offset: page * PAGE })
      .then((r) => { if (alive) { setItems(r.items); setTotal(r.total) } })
      .catch(() => { if (alive) setItems([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [page])

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' }) : ''
  const pages = Math.ceil(total / PAGE)

  return (
    <div className={`${wrap} py-6`}>
      <nav className="flex gap-1.5 py-3 text-sm text-muted">
        <Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> / <span className="text-fg">{t('community.title')}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name="users" className="text-brand-600" /> {t('community.title')}</h1>
          <p className="text-muted">{t('community.desc')}</p>
        </div>
        <Link to="/builder" className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
          <Icon name="cpu" size={16} /> {t('community.buildYours')}
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-line bg-surface p-10 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15"><Icon name="users" size={28} /></div>
          <h2 className="text-lg font-bold">{t('community.empty')}</h2>
          <p className="mt-1 text-sm text-muted">{t('community.emptyDesc')}</p>
          <Link to="/builder" className="mt-5 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">{t('community.buildYours')}</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <Link key={b.share_code} to={`/builder?b=${b.share_code}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-lg">
                <div className="flex gap-1.5 bg-surface2/60 p-3">
                  {(b.thumbs.length ? b.thumbs : [null, null, null]).slice(0, 4).map((src, i) => (
                    <div key={i} className="grid h-16 flex-1 place-items-center overflow-hidden rounded-lg bg-white">
                      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                        : <Icon name="cpu" size={18} className="text-zinc-300" />}
                    </div>
                  ))}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-1 font-bold group-hover:text-brand-600">{b.name}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Icon name="user" size={13} /> {b.author_name || t('community.anonymous')} · {fmtDate(b.updated_at)}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted">{b.parts} {t('community.parts')}</div>
                      <div className="nums text-lg font-bold text-brand-600">฿{fmt(b.total)}</div>
                    </div>
                    <span className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      {t('community.view')} <Icon name="arrowRight" size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-line disabled:opacity-40 hover:bg-surface2 cursor-pointer"><Icon name="chevronLeft" size={18} /></button>
              <span className="px-3 text-sm text-muted">{page + 1} / {pages}</span>
              <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-line disabled:opacity-40 hover:bg-surface2 cursor-pointer"><Icon name="chevronRight" size={18} /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
