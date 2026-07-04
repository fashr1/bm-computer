import React from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Range } from 'react-range'
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
  const navigate = useNavigate()
  const cat = params.get('cat') || ''
  const brand = params.get('brand') || ''
  const q = params.get('q') || ''
  const paramMin = params.get('min')
  const paramMax = params.get('max')

  const { data, loading } = useFetch(() => fetchProducts({ cat, brand }), [cat, brand])
  const { data: brands } = useFetch(() => fetchBrands(), [])
  const { categories, loading: catsLoading, catName } = useCatalog()
  const list = q ? fuzzyFilter(data || [], q, catName) : (data || [])

  // derive price bounds from data
  const prices = (data || []).map(p => p.salePrice ?? p.price ?? 0)
  const dataMin = prices.length ? Math.min(...prices) : 0
  const dataMax = prices.length ? Math.max(...prices) : 0

  // price state
  const [minPrice, setMinPrice] = React.useState(paramMin ? Number(paramMin) : dataMin)
  const [maxPrice, setMaxPrice] = React.useState(paramMax ? Number(paramMax) : dataMax)
  const updateTimer = React.useRef(null)
  const fmt = React.useMemo(() => new Intl.NumberFormat('th-TH'), [])

  React.useEffect(() => {
    if (dataMax <= dataMin) return
    // if prev is 0 (uninitialized) or out of range, reset to proper bound
    setMinPrice(prev => {
      if (!prev || prev < dataMin || prev > dataMax) return paramMin ? Number(paramMin) : dataMin
      return Math.max(dataMin, Math.min(prev, dataMax))
    })
    setMaxPrice(prev => {
      if (!prev || prev < dataMin || prev > dataMax) return paramMax ? Number(paramMax) : dataMax
      return Math.max(dataMin, Math.min(prev, dataMax))
    })
  }, [dataMin, dataMax, paramMin, paramMax])

  // computed safe values — fall back to data bounds if state hasn't updated yet
  const _smin = Math.max(dataMin, Math.min(minPrice > 0 ? minPrice : dataMin, dataMax))
  const _smax = Math.max(dataMin, Math.min(maxPrice > 0 ? maxPrice : dataMax, dataMax))
  const safeMin = Math.min(_smin, _smax)
  const safeMax = Math.max(_smin, _smax)
  const rangeReady = dataMax > dataMin && safeMax > safeMin

  // apply price filtering based on URL params if present
  const filterMin = paramMin ? Number(paramMin) : null
  const filterMax = paramMax ? Number(paramMax) : null
  const filteredList = list.filter(p => {
    const price = p.salePrice ?? p.price ?? 0
    if (filterMin != null && price < filterMin) return false
    if (filterMax != null && price > filterMax) return false
    return true
  })

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

          {/* Price range (top) */}
          <div className="border-b border-line py-4">
            <h4 className="mb-3 text-sm font-semibold">{t('list.price') || 'Price'}</h4>
            <div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <div>{fmt.format(dataMin)}</div>
                <div>{fmt.format(dataMax)}</div>
              </div>

              {rangeReady ? (
              <Range
                step={1}
                min={dataMin}
                max={dataMax}
                values={[safeMin, safeMax]}
                onChange={(values) => {
                  const [a, b] = values
                  setMinPrice(a)
                  setMaxPrice(b)
                  if (updateTimer.current) clearTimeout(updateTimer.current)
                  updateTimer.current = setTimeout(() => {
                    navigate(buildUrl({ min: String(a), max: String(b) }))
                  }, 300)
                }}
                renderTrack={({ props, children }) => {
                  const left = ((minPrice - dataMin) / Math.max(1, dataMax - dataMin)) * 100
                  const right = ((maxPrice - dataMin) / Math.max(1, dataMax - dataMin)) * 100
                  return (
                    <div {...props} className="w-full h-8 flex items-center" style={{ ...props.style }}>
                      <div className="relative w-full h-2 rounded bg-line">
                        <div style={{ position: 'absolute', left: `${left}%`, right: `${100 - right}%` }} className="h-2 bg-brand-600 rounded" />
                      </div>
                      {children}
                    </div>
                  )
                }}
                renderThumb={({ index, props }) => (
                  <div {...props} className="h-8 w-8 flex items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
                    <div className="text-xs pointer-events-none">{fmt.format(index === 0 ? minPrice : maxPrice)}</div>
                  </div>
                )}
              />
              ) : (
                <div className="py-4 text-sm text-muted">{t('list.price')}: {fmt.format(dataMin)}</div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  className={cx('rounded-lg border px-3 py-1 text-sm', (minPrice !== dataMin || maxPrice !== dataMax) ? 'bg-brand-600 text-white border-brand-600' : 'border-line')}
                  onClick={() => navigate(buildUrl({ min: String(minPrice), max: String(maxPrice) }))}>{t('common.confirm') || 'Confirm'}</button>
                <button
                  className={cx('rounded-lg border px-3 py-1 text-sm', (minPrice !== dataMin || maxPrice !== dataMax) ? 'bg-surface2 ring-2 ring-offset-1 ring-brand-400' : 'border-line')}
                  onClick={() => {
                    setMinPrice(dataMin)
                    setMaxPrice(dataMax)
                    navigate(buildUrl({ min: null, max: null }))
                  }}>{t('common.clear') || 'Clear'}</button>
              </div>
            </div>
          </div>

          {/* Category */}
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

          {/* Brand */}
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
              <span className="text-sm text-muted">{loading ? t('common.loading') : t('list.found', { n: filteredList.length })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : filteredList.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>

          {!loading && filteredList.length === 0 && (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">{t('list.noResults')}</div>
          )}
        </section>
      </div>
    </div>
  )
}
