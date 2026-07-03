import { useSearchParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Icon } from '../components/Icons'
import { cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { fetchProducts, fetchBrands } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { fuzzyFilter } from '../lib/search'
import { ProductCardSkeleton, Skeleton } from '../components/Skeleton'
import { useCatalog } from '../catalog/CatalogContext'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'

export default function ProductList() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const cat = params.get('cat') || ''
  const brand = params.get('brand') || ''
  const q = params.get('q') || ''

  const { data, loading } = useFetch(() => fetchProducts({ cat, brand }), [cat, brand])
  const { data: brands } = useFetch(() => fetchBrands(), [])
  const { categories, loading: catsLoading, catName } = useCatalog()
  const list = q ? fuzzyFilter(data || [], q, catName) : (data || [])

  const buildUrl = (updates) => {
    const p = new URLSearchParams(params)
    Object.entries(updates).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    const s = p.toString()
    return s ? `/products?${s}` : '/products'
  }

  const title = q ? `${t('list.searchFor')} "${q}"` : cat ? catName(cat) : brand ? brand : t('list.title')
  usePageMeta(title !== t('list.title') ? title : t('list.title'))

  return (
    <div className={`${wrap} py-6`}>
      <nav className="flex flex-wrap gap-1.5 py-3 text-sm text-muted">
        <Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> / <Link to="/products" className="hover:text-brand-600">{t('list.products')}</Link>
        {(cat || brand || q) && <> / <span className="text-fg">{title}</span></>}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[250px_1fr]">
        {/* FILTERS */}
        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-[150px]">
          <h3 className="mb-2 font-bold">{t('list.filters')}</h3>

          <div className="border-b border-line py-4">
            <h4 className="mb-3 text-sm font-semibold">{t('list.category')}</h4>
            <div className="flex flex-col gap-1">
              {catsLoading
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="my-1 h-4 w-3/4" />)
                : categories.map((c) => (
                    <Link key={c.slug} to={buildUrl({ cat: c.slug === cat ? null : c.slug })}
                      className={cx('flex items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors hover:text-brand-600',
                        c.slug === cat ? 'font-bold text-brand-600' : 'text-fg')}>
                      <Icon name={c.icon || 'box'} size={16} /> {catName(c.slug)}
                    </Link>
                  ))}
            </div>
          </div>

          <div className="border-b border-line py-4">
            <h4 className="mb-3 text-sm font-semibold">{t('list.brand')}</h4>
            <div className="flex flex-col gap-1">
              {(brands || []).map((b) => (
                <Link key={b.id} to={buildUrl({ brand: b.slug === brand ? null : b.slug })}
                  className={cx('rounded-md px-1 py-1 text-sm transition-colors hover:text-brand-600', b.slug === brand ? 'font-bold text-brand-600' : 'text-fg')}>
                  {b.name}
                </Link>
              ))}
            </div>
          </div>

          {(cat || brand || q) && <Link to="/products" className="mt-3 block rounded-lg border border-line py-2 text-center text-sm font-semibold transition-colors hover:bg-surface2">{t('common.clear')}</Link>}
        </aside>

        {/* RESULTS */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
              <span className="text-sm text-muted">{loading ? t('common.loading') : t('list.found', { n: list.length })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>

          {!loading && list.length === 0 && (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">{t('list.noResults')}</div>
          )}
        </section>
      </div>
    </div>
  )
}
