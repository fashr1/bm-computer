import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { fetchBrands, fetchProducts } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { brandLogo } from '../lib/brands'
import { BrandBarSkeleton } from './Skeleton'

// กำแพงแบรนด์: โลโก้จริง (Simple Icons สีแบรนด์ / favicon) - แสดงเฉพาะแบรนด์ที่มีสินค้าจริง
// เรียงเป็นกริดหลายแถวแบบกำแพงแบรนด์ (ตัดจำนวนไม่ให้ยาวเกิน)
const MAX_BRANDS = 28

export default function BrandBar() {
  const { t } = useLang()
  const { data: brands } = useFetch(() => fetchBrands(), [])
  const { data: products } = useFetch(() => fetchProducts({}), [])
  if (!brands || !products) return <BrandBarSkeleton />

  const present = new Set(products.map((p) => p.brand))
  const list = brands.filter((b) => present.has(b.name)).slice(0, MAX_BRANDS)
  if (!list.length) return null

  return (
    <section className="mt-12 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h2 className="mb-6 text-center text-lg font-bold">{t('home.topBrands')}</h2>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-10">
        {list.map((b) => <BrandChip key={b.id} b={b} />)}
      </div>
    </section>
  )
}

function BrandChip({ b }) {
  const [err, setErr] = useState(false)
  const src = brandLogo(b.slug, b.logo_url)
  return (
    <Link to={`/products?brand=${b.slug}`} title={b.name}
      className="grid h-9 w-24 place-items-center opacity-70 transition hover:opacity-100 sm:h-10 sm:w-28">
      {err || !src
        ? <span className="text-sm font-bold text-fg">{b.name}</span>
        : <img src={src} alt={b.name} loading="lazy"
            className="max-h-9 max-w-[100px] object-contain"
            onError={() => setErr(true)} />}
    </Link>
  )
}
