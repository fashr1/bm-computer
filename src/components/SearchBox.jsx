import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import { cx } from '../lib/ui'
import { fmt } from '../data/mock'
import { useLang } from '../i18n/LanguageContext'
import { useCatalog } from '../catalog/CatalogContext'
import { getSearchIndex } from '../lib/searchIndex'
import { fuzzyFilter } from '../lib/search'

// ช่องค้นหา + dropdown แนะนำสินค้าแบบทันที (autocomplete) - fuzzy รองรับพิมพ์ผิด
// ใช้ดัชนีเบาที่โหลดครั้งเดียว (lib/searchIndex) ค้นในเครื่อง ไม่ยิง network ทุกคีย์
export default function SearchBox({ onNavigate, autoFocus = false }) {
  const { t } = useLang()
  const { categories, catName } = useCatalog()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const loadIndex = () => { if (!index) getSearchIndex().then(setIndex) }

  // หมวดที่ชื่อเข้ากับคำค้น (โชว์บนสุดเป็นชอร์ตคัต)
  const catMatches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 1) return []
    return categories.filter((c) => catName(c.slug).toLowerCase().includes(needle)).slice(0, 2)
  }, [q, categories, catName])

  const products = useMemo(() => {
    const needle = q.trim()
    if (needle.length < 1 || !index) return []
    return fuzzyFilter(index, needle, catName).slice(0, 7)
  }, [q, index, catName])

  // รายการที่เลือกได้ทั้งหมด (หมวด + สินค้า) เรียงตามที่แสดง เพื่อคุมด้วยคีย์บอร์ด
  const flat = useMemo(() => [
    ...catMatches.map((c) => ({ type: 'cat', slug: c.slug })),
    ...products.map((p) => ({ type: 'product', slug: p.slug })),
  ], [catMatches, products])

  const go = (to) => { setOpen(false); setQ(''); setActive(-1); onNavigate?.(); nav(to) }
  const submit = (e) => {
    e.preventDefault()
    if (active >= 0 && flat[active]) {
      const it = flat[active]
      return go(it.type === 'cat' ? `/products?cat=${it.slug}` : `/product/${it.slug}`)
    }
    const term = q.trim()
    go(term ? `/products?q=${encodeURIComponent(term)}` : '/products')
  }
  const onKey = (e) => {
    if (!open || !flat.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % flat.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? flat.length - 1 : a - 1)) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const showDrop = open && q.trim().length >= 1 && (catMatches.length > 0 || products.length > 0)

  return (
    <div ref={boxRef} className="relative flex-1">
      <form role="search" onSubmit={submit}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
        <Icon name="search" size={18} className="text-zinc-400" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => { loadIndex(); setOpen(true) }}
          onKeyDown={onKey}
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          placeholder={t('common.search')} aria-label={t('common.search')} autoComplete="off"
          role="combobox" aria-expanded={showDrop} aria-controls="search-suggest" />
        {q && <button type="button" onClick={() => { setQ(''); setActive(-1) }} className="text-zinc-400 hover:text-white cursor-pointer" aria-label="clear"><Icon name="x" size={16} /></button>}
      </form>

      {showDrop && (
        <div id="search-suggest" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-line bg-surface text-fg shadow-2xl">
          {catMatches.map((c, i) => (
            <button key={`c-${c.slug}`} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/products?cat=${c.slug}`)}
              className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors', active === i ? 'bg-surface2' : 'hover:bg-surface2')}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/15"><Icon name={c.icon || 'box'} size={18} /></span>
              <span className="text-sm font-semibold">{catName(c.slug)}</span>
              <span className="ml-auto text-xs text-muted">{t('nav.categories')}</span>
            </button>
          ))}
          {catMatches.length > 0 && products.length > 0 && <div className="border-t border-line" />}
          {products.map((p, i) => {
            const idx = catMatches.length + i
            return (
              <button key={p.slug} type="button" onMouseEnter={() => setActive(idx)} onClick={() => go(`/product/${p.slug}`)}
                className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors', active === idx ? 'bg-surface2' : 'hover:bg-surface2')}>
                <img src={p.image || 'https://placehold.co/64x64/f1f1f4/9ca3af?text=BM'} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                  {p.brand && <div className="text-xs text-muted">{p.brand}{p.cat ? ` · ${catName(p.cat)}` : ''}</div>}
                </div>
                <span className="nums shrink-0 text-sm font-bold text-brand-600">฿{fmt(p.price)}</span>
              </button>
            )
          })}
          <button type="button" onClick={() => go(`/products?q=${encodeURIComponent(q.trim())}`)}
            className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-brand-600 transition-colors hover:bg-surface2">
            <Icon name="search" size={16} /> {t('common.searchAll', { q: q.trim() })}
          </button>
        </div>
      )}
    </div>
  )
}
