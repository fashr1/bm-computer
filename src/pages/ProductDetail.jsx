import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { fmt } from '../data/mock'
import ProductCard from '../components/ProductCard'
import { Icon } from '../components/Icons'
import Lightbox from '../components/Lightbox'
import { badgeMap, badgeLabel, cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { fetchProductBySlug, fetchProducts } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../auth/AuthContext'
import { useAuthNav } from '../auth/useAuthNav'
import { ProductDetailSkeleton } from '../components/Skeleton'
import { useCatalog } from '../catalog/CatalogContext'
import { usePageMeta } from '../lib/usePageMeta'
import Reviews from '../components/Reviews'

const wrap = 'mx-auto max-w-[1200px] px-4'
const PLACEHOLDER = 'https://placehold.co/600x600/f1f1f4/9ca3af?text=BM+Computer'

export default function ProductDetail() {
  const { id } = useParams()
  const { lang, t } = useLang()
  const { catName } = useCatalog()
  const { data: p, loading } = useFetch(() => fetchProductBySlug(id), [id])
  const { data: rel } = useFetch(() => (p ? fetchProducts({ cat: p.cat }) : Promise.resolve([])), [p?.cat])
  usePageMeta(p?.name, p ? `${p.name} · ${catName(p.cat)} · ฿${fmt(p.price)} - BM Computer` : undefined)

  const [tab, setTab] = useState('spec')
  const [qty, setQty] = useState(1)
  const [gi, setGi] = useState(0)
  const [box, setBox] = useState(false)
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)
  const { add } = useCart()
  const { user } = useAuth()
  const { open: openAuth } = useAuthNav()
  const nav = useNavigate()
  const addToCart = () => { if (!user) { openAuth('login'); return } add(p, qty); setAdded(true); setTimeout(() => setAdded(false), 1200) }
  const buyNow = () => { if (!user) { openAuth('login'); return } add(p, qty); nav('/checkout') }
  const copyLink = () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  if (loading) return <div className={`${wrap} py-6`}><ProductDetailSkeleton /></div>
  if (!p) return <div className={`${wrap} py-20 text-center`}><h2 className="text-2xl font-bold">{t('notfound.title')}</h2><Link to="/products" className="mt-4 inline-block text-brand-600">{t('list.products')}</Link></div>

  const images = p.images.length ? p.images : [PLACEHOLDER]
  const b = p.badge ? badgeMap[p.badge] : null
  const related = (rel || []).filter((x) => x.id !== p.id).slice(0, 4)

  return (
    <div className={`${wrap} py-6`}>
      <nav className="flex flex-wrap gap-1.5 py-3 text-sm text-muted">
        <Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> /
        <Link to={`/products?cat=${p.cat}`} className="hover:text-brand-600">{catName(p.cat)}</Link> /
        <span className="text-fg">{p.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* GALLERY */}
        <div>
          <button onClick={() => setBox(true)} className="group relative block w-full overflow-hidden rounded-2xl border border-line bg-white" title={t('common.clickToZoom')}>
            <img src={images[gi]} alt={p.name} onError={(e) => { e.currentTarget.src = PLACEHOLDER }} className="aspect-square w-full object-contain p-6" />
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"><Icon name="search" size={14} /> {t('common.zoom')}</span>
          </button>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <button key={i} onClick={() => setGi(i)} className={cx('overflow-hidden rounded-lg border-2 bg-white', i === gi ? 'border-brand-500' : 'border-line')}>
                  <img src={src} alt="" onError={(e) => { e.currentTarget.src = PLACEHOLDER }} className="aspect-square w-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold">{p.brand}</span>
            {b && <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', b.cls)}>{badgeLabel[lang][p.badge]}</span>}
            <span className={cx('text-xs font-semibold', p.stock <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
              {p.stock <= 5 ? t('common.lowStock', { n: p.stock }) : t('common.inStock')}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-amber-500">★ {p.rating}</span>
            <span className="text-muted">{p.reviews} {t('common.reviews')}</span>
            <span className="text-muted">· {t('common.sku')}: {p.sku}</span>
            <button onClick={copyLink} className="ml-auto flex items-center gap-1 text-muted transition-colors hover:text-brand-600 cursor-pointer">
              <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? t('common.copied') : t('common.copyLink')}
            </button>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="nums text-3xl font-extrabold text-brand-600">฿{fmt(p.price)}</span>
            {p.old && <><span className="nums text-lg text-zinc-400 line-through">฿{fmt(p.old)}</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('common.save')} ฿{fmt(p.old - p.price)}</span></>}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-4 py-3 text-sm">
            <span className="text-muted">{t('pdp.installment')}</span><b className="nums">฿{fmt(Math.round(p.price / 10))}{t('common.perMonth')}</b>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-line">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center hover:bg-surface2 cursor-pointer" aria-label="-"><Icon name="minus" size={16} /></button>
              <span className="nums w-12 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="grid h-11 w-11 place-items-center hover:bg-surface2 cursor-pointer" aria-label="+"><Icon name="plus" size={16} /></button>
            </div>
            <button onClick={addToCart}
              className={cx('flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold transition-colors cursor-pointer',
                added ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-line hover:bg-surface2')}>
              <Icon name={added ? 'check' : 'cart'} size={18} /> {added ? t('common.added') : t('pdp.addToCart')}
            </button>
            <button onClick={buyNow} className="flex-1 rounded-xl bg-brand-600 px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer">{t('common.buyNow')}</button>
          </div>

          <ul className="mt-1 flex flex-col gap-2 text-sm">
            {[t('pdp.b1'), t('pdp.b2'), t('pdp.b3')].map((x) => (
              <li key={x} className="flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-500" /> {x}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* TABS */}
      <section className="mt-12">
        <div className="mb-5 flex gap-1 border-b border-line">
          {[['spec', t('pdp.specs')], ['desc', t('pdp.desc')], ['review', t('pdp.reviewsTab')]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cx('cursor-pointer border-b-2 px-4 py-3 font-semibold transition-colors',
                tab === k ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted hover:text-fg')}>{label}</button>
          ))}
        </div>

        {tab === 'spec' && (
          <table className="w-full border-collapse overflow-hidden rounded-xl">
            <tbody>
              {Object.entries(p.specs).map(([k, v]) => (
                <tr key={k} className="border-b border-line">
                  <th className="w-2/5 bg-surface2 p-3 text-left text-sm font-semibold text-muted align-top">{k}</th>
                  <td className="p-3 text-sm">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'desc' && <p className="max-w-[70ch] text-muted">{p.name} - {t('pdp.descBody')}</p>}
        {tab === 'review' && <Reviews slug={p.slug} fallbackRating={p.rating} />}
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-xl font-bold sm:text-2xl">{t('pdp.related')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}

      {box && <Lightbox images={images} index={gi} setIndex={setGi} onClose={() => setBox(false)} />}
    </div>
  )
}
