import { Link } from 'react-router-dom'
import ProductRow from '../components/ProductRow'
import { Icon } from '../components/Icons'
import HeroCarousel from '../components/HeroCarousel'
import OrderShowcase from '../components/OrderShowcase'
import Typewriter from '../components/Typewriter'
import BrandBar from '../components/BrandBar'
import FlashSale from '../components/FlashSale'
import { useLang } from '../i18n/LanguageContext'
import { useCatalog } from '../catalog/CatalogContext'
import { fetchProducts, fetchSlides, fetchBrands, fetchLatestReviews } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { Skeleton } from '../components/Skeleton'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'

function SectionHead({ title, sub, to, icon }) {
  const { t } = useLang()
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          {icon && <Icon name={icon} className="text-brand-600" />}{title}
        </h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {to && (
        <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {t('common.viewAll')} <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </div>
  )
}

export default function Home() {
  const { t, lang } = useLang()
  const { categories, loading: catsLoading, catName } = useCatalog()
  const { data, loading } = useFetch(() => fetchProducts({}), [])
  const { data: heroSlides } = useFetch(() => fetchSlides('hero'), [])
  const { data: brands } = useFetch(() => fetchBrands(), [])
  const { data: reviews } = useFetch(() => fetchLatestReviews(6), [])
  usePageMeta(null, t('home.heroDesc'))
  const list = data || []
  const featured = list.filter((p) => p.featured)
  const newArrivals = [...list].reverse().slice(0, 12)
  const flash = list.filter((p) => p.sale)

  const stats = [
    [list.length ? `${list.length}+` : '150+', t('home.statProducts')],
    [(brands || []).length || 39, t('home.statBrands')],
    [categories.length || 11, t('home.statCats')],
    ['1-2 ' + (lang === 'th' ? 'วัน' : 'days'), t('home.statShip')],
  ]

  return (
    <div className={`${wrap} py-8`}>
      {/* HERO: หัวใหญ่ซ้าย + โชว์เคสหน้าคำสั่งซื้อขวา (ประกอบจากข้อมูลจริง - ภาพตกแต่ง hover ได้ คลิกไม่มีผล) */}
      <section className="grid items-center gap-10 py-4 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-8">
        <div>
          <h1 className="text-3xl font-extrabold leading-[1.2] tracking-tight sm:text-4xl xl:text-5xl">
            <span className="block">{t('home.heroLeadStatic')}</span>
            {/* ล็อกความสูงตายตัว: ข้อความพิมพ์/ลบยาวแค่ไหนก็ไม่ดันหน้าเว็บ */}
            <span className="block h-[2.5em] overflow-hidden text-brand-600">
              <Typewriter phrases={t('home.heroSlogans')} />
            </span>
          </h1>
          <p className="mt-2 max-w-[46ch] text-base leading-relaxed text-muted">{t('home.heroDesc')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/products" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700">
              <Icon name="cart" size={17} /> {t('home.shopNow')}
            </Link>
            <Link to="/builder" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-bold transition-colors hover:border-brand-500 hover:text-brand-600">
              <Icon name="cpu" size={17} /> {t('home.heroBuild')}
            </Link>
          </div>
        </div>
        <OrderShowcase products={list} loading={loading} />
      </section>

      {/* แบนเนอร์โฆษณา/โปรโมชัน (ย้ายลงมาจาก header) - เนื้อหาคุมจากหลังบ้าน */}
      <section className="mt-10">
        <HeroCarousel slides={heroSlides || []} />
      </section>

      {/* แถบตัวเลขร้าน */}
      <section className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-4">
        {stats.map(([n, label]) => (
          <div key={label} className="py-2 text-center">
            <div className="nums text-2xl font-extrabold text-brand-600">{n}</div>
            <div className="mt-1 text-xs text-muted">{label}</div>
          </div>
        ))}
      </section>

      {/* CATEGORIES */}
      <section className="mt-12">
        <SectionHead title={t('home.byCategory')} to="/products" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {catsLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-xl" />)
            : categories.map((c) => (
                <Link key={c.slug} to={`/products?cat=${c.slug}`}
                  className="card-hover flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-2 py-4 text-center hover:border-brand-500 hover:shadow-md">
                  <Icon name={c.icon || 'box'} size={26} className="text-brand-600" />
                  <span className="text-xs font-semibold leading-tight">{catName(c.slug)}</span>
                </Link>
              ))}
        </div>
      </section>

      {/* BRAND BAR */}
      <BrandBar />

      {/* FLASH SALE */}
      <FlashSale items={flash} />

      {/* FEATURED */}
      <section className="mt-12">
        <SectionHead title={t('home.featured')} icon="flame" to="/products" />
        <ProductRow items={featured} loading={loading} />
      </section>

      {/* NEW ARRIVALS */}
      <section className="mt-12">
        <SectionHead title={t('home.newArrivals')} to="/products" />
        <ProductRow items={newArrivals} loading={loading} />
      </section>

      {/* REVIEWS จากผู้ซื้อจริง */}
      {(reviews || []).length > 0 && (
        <section className="mt-12">
          <SectionHead title={t('home.reviewsTitle')} sub={t('home.reviewsSub')} icon="star" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <article key={r.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-500" aria-label={`${r.rating}/5`}>
                    {'★'.repeat(r.rating)}<span className="text-line">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                  {r.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Icon name="check" size={11} /> {t('home.verifiedBuyer')}
                    </span>
                  )}
                </div>
                <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed">"{r.comment}"</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="font-semibold">{r.author_name || t('community.anonymous')}</span>
                  <span>{new Date(r.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <Link to={`/product/${r.product.slug}`} className="mt-3 flex items-center gap-2.5 rounded-xl border border-line p-2 transition-colors hover:border-brand-500">
                  {r.product.image && <img src={r.product.image} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
                  <span className="line-clamp-1 text-xs font-semibold">{r.product.name}</span>
                  <Icon name="arrowRight" size={13} className="ml-auto shrink-0 text-muted" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TRUST BAR */}
      <section className="mt-12 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap justify-around gap-6">
          {[['shield', t('home.trust1')], ['truck', t('home.trust2')], ['card', t('home.trust3')], ['wrench', t('home.trust4')]].map(([ic, label]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15"><Icon name={ic} /></span>
              <b className="text-sm">{label}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
