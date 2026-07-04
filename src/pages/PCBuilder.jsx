import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { fmt } from '../data/mock'
import { Icon } from '../components/Icons'
import { cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { useAuthNav } from '../auth/useAuthNav'
import { useCart } from '../cart/CartContext'
import { usePageMeta } from '../lib/usePageMeta'
import { fetchProducts, fetchAttributeDefs, fetchSharedBuild } from '../lib/api'
import { SLOTS, slotByKey, checkBuild, estimatePower, recommendPsu, psuStatus, perfEstimate, buildTotals, compatSummary } from '../lib/pcbuilder/compat'
import PartPicker from '../components/builder/PartPicker'
import BuildSummary from '../components/builder/BuildSummary'
import { MyBuildsDialog, ShareDialog, useBuildActions } from '../components/builder/BuildDialogs'

const wrap = 'mx-auto max-w-[1200px] px-4'
const DRAFT_KEY = 'bm-build-draft'

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY))
    if (d && Array.isArray(d.items)) return { name: d.name || '', items: d.items, budget: d.budget || '', buildId: d.buildId || null }
  } catch { /* ignore */ }
  return { name: '', items: [], budget: '', buildId: null }
}

export default function PCBuilder() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { open: openAuth } = useAuthNav()
  const { add } = useCart()
  const nav = useNavigate()
  const [params] = useSearchParams()
  usePageMeta(t('builder.title'), t('builder.desc'))

  // ---------- ข้อมูลสินค้า + นิยาม attr (โหลดครั้งเดียว) ----------
  const [byCat, setByCat] = useState(null)      // { catSlug: [products] }
  const [defs, setDefs] = useState([])          // attribute_defs ทุกหมวด
  useEffect(() => {
    let alive = true
    const cats = [...new Set(SLOTS.map((s) => s.cat))]
    Promise.all([
      Promise.all(cats.map((c) => fetchProducts({ cat: c }).catch(() => []))),
      fetchAttributeDefs().catch(() => []),
    ]).then(([lists, d]) => {
      if (!alive) return
      setByCat(Object.fromEntries(cats.map((c, i) => [c, lists[i]])))
      setDefs(d)
    })
    return () => { alive = false }
  }, [])
  const byId = useMemo(() => {
    if (!byCat) return {}
    return Object.fromEntries(Object.values(byCat).flat().map((p) => [p.id, p]))
  }, [byCat])

  // ---------- สถานะ build (draft อัตโนมัติใน localStorage) ----------
  const [draft] = useState(loadDraft)
  const [items, setItems] = useState(draft.items)
  const [name, setName] = useState(draft.name)
  const [budget, setBudget] = useState(draft.budget)
  const [buildId, setBuildId] = useState(draft.buildId) // id สเปคที่โหลดมาแก้ (บันทึกทับ) - เก็บใน draft ด้วย
  const [picker, setPicker] = useState(null)        // slot key ที่กำลังเลือก
  const [myOpen, setMyOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [addedAll, setAddedAll] = useState(false)
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, items, budget, buildId })) } catch { /* ignore */ }
  }, [name, items, budget, buildId])

  // ---------- โหมดดูสเปคที่แชร์ (?b=code) ----------
  const shareCode = params.get('b')
  const [shared, setShared] = useState(undefined) // undefined=ยังไม่โหลด, null=ไม่พบ
  useEffect(() => {
    if (!shareCode) { setShared(undefined); return }
    let alive = true
    fetchSharedBuild(shareCode).then((b) => { if (alive) setShared(b) }).catch(() => { if (alive) setShared(null) })
    return () => { alive = false }
  }, [shareCode])
  const viewingShared = !!shareCode
  const activeItems = viewingShared ? (shared?.items || []) : items

  // ---------- คำนวณจาก engine ----------
  const issues = useMemo(() => checkBuild(activeItems, byId), [activeItems, byId])
  const { totalW } = useMemo(() => estimatePower(activeItems, byId), [activeItems, byId])
  const recW = useMemo(() => recommendPsu(totalW, activeItems, byId), [totalW, activeItems, byId])
  const totals = useMemo(() => buildTotals(activeItems, byId), [activeItems, byId])
  const perf = useMemo(() => perfEstimate(activeItems, byId), [activeItems, byId])
  const compat = useMemo(() => compatSummary(issues), [issues])
  const psuPicked = activeItems.find((i) => i.slot === 'psu' && byId[i.id])
  const psuState = psuPicked ? psuStatus(byId[psuPicked.id]?.attrs?.wattage_w, totalW) : null

  // ---------- แก้ไขชิ้นส่วน ----------
  const pickPart = (slotKey, product) => {
    const slot = slotByKey[slotKey]
    setItems((cur) => {
      if (slot.multi) {
        const found = cur.find((i) => i.slot === slotKey && i.id === product.id)
        if (found) return cur.map((i) => (i === found ? { ...i, qty: Math.min((i.qty || 1) + 1, 4) } : i))
        if (cur.filter((i) => i.slot === slotKey).length >= (slot.maxItems || 4)) return cur
        return [...cur, { slot: slotKey, id: product.id, qty: 1 }]
      }
      const rest = cur.filter((i) => i.slot !== slotKey)
      return [...rest, { slot: slotKey, id: product.id, qty: 1 }]
    })
    setPicker(null)
  }
  const removeItem = (slotKey, id) => setItems((cur) => cur.filter((i) => !(i.slot === slotKey && i.id === id)))
  const setQty = (slotKey, id, qty) =>
    setItems((cur) => cur.map((i) => (i.slot === slotKey && i.id === id ? { ...i, qty: Math.max(1, Math.min(4, qty)) } : i)))
  const clearAll = () => {
    if (!confirm(t('builder.confirmClear'))) return
    setItems([]); setBuildId(null); setName(''); setBudget('')
  }

  // ---------- บันทึก/แชร์ (login-gate) ----------
  const actions = useBuildActions({ user, openAuth, name, setName, items, budget, buildId, setBuildId, t })

  const addAllToCart = () => {
    if (!user) { openAuth('login'); return }
    let n = 0
    for (const it of activeItems) {
      const p = byId[it.id]
      if (p && p.stock > 0) { add(p, it.qty || 1); n++ }
    }
    if (n) { setAddedAll(true); setTimeout(() => setAddedAll(false), 1500) }
  }

  const useSharedBuild = () => {
    if (!shared) return
    setItems(shared.items || [])
    setName(shared.name || '')
    setBudget(shared.budget || '')
    setBuildId(null)
    nav('/builder', { replace: true })
  }

  const loading = !byCat
  const coreSlots = SLOTS.filter((s) => s.core)
  const optSlots = SLOTS.filter((s) => !s.core)

  return (
    <div className={`${wrap} py-6 pb-28 lg:pb-6`}>
      <nav className="flex gap-1.5 py-3 text-sm text-muted">
        <Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> / <span className="text-fg">{t('nav.builder')}</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name="cpu" className="text-brand-600" /> {t('builder.title')}</h1>
          <p className="text-muted">{t('builder.desc')}</p>
        </div>
        {!viewingShared && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { if (!user) { openAuth('login'); return } setMyOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2 cursor-pointer">
              <Icon name="doc" size={16} /> {t('builder.myBuilds')}
            </button>
            <button onClick={clearAll} disabled={!items.length}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2 disabled:opacity-40 cursor-pointer">
              <Icon name="trash" size={16} /> {t('builder.clear')}
            </button>
          </div>
        )}
      </div>

      {/* แบนเนอร์โหมดดูสเปคที่แชร์ */}
      {viewingShared && (
        shared === undefined ? (
          <div className="skeleton mb-4 h-12 rounded-xl" aria-hidden="true" />
        ) : shared === null ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 p-4 text-sm font-semibold text-red-600 dark:text-red-400">
            <Icon name="x" size={18} /> {t('builder.sharedNotFound')}
            <Link to="/builder" className="ml-auto rounded-lg border border-line px-3 py-1.5 hover:bg-surface2">{t('builder.title')}</Link>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-brand-600/10 p-4 text-sm font-semibold text-brand-700 dark:text-brand-400">
            <Icon name="share" size={18} /> {t('builder.sharedBanner', { name: shared.name })}
            <button onClick={useSharedBuild}
              className="ml-auto rounded-lg bg-brand-600 px-3 py-1.5 text-white transition-colors hover:bg-brand-700 cursor-pointer">
              {t('builder.useThisBuild')}
            </button>
          </div>
        )
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_350px]">
        {/* ---------- รายการ slot ---------- */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-muted">{t('builder.coreTitle')}</h2>
          {coreSlots.map((s) => (
            <SlotCard key={s.key} slot={s} items={activeItems} byId={byId} issues={issues} loading={loading}
              readOnly={viewingShared} t={t} onPick={() => setPicker(s.key)} onRemove={removeItem} onQty={setQty} />
          ))}
          <h2 className="mt-3 text-sm font-bold text-muted">{t('builder.optionalTitle')}</h2>
          {optSlots.map((s) => (
            <SlotCard key={s.key} slot={s} items={activeItems} byId={byId} issues={issues} loading={loading}
              readOnly={viewingShared} t={t} onPick={() => setPicker(s.key)} onRemove={removeItem} onQty={setQty} />
          ))}
        </div>

        {/* ---------- สรุป (sticky) ---------- */}
        <BuildSummary
          t={t} lang={lang} loading={loading} readOnly={viewingShared}
          name={name} setName={setName} budget={budget} setBudget={setBudget}
          totals={totals} totalW={totalW} recW={recW} psuState={psuState} perf={perf}
          issues={issues} compat={compat}
          addedAll={addedAll} onAddAll={addAllToCart}
          saving={actions.saving} savedFlash={actions.savedFlash}
          onSave={() => actions.save()}
          onShare={async () => { const b = await actions.ensureSaved(); if (b) setShareOpen(true) }}
        />
      </div>

      {/* แถบสรุปล่าง (มือถือ) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-1">
          <div className="min-w-0">
            <div className="nums text-lg font-bold text-brand-600">฿{fmt(totals.total)}</div>
            <div className={cx('truncate text-xs font-semibold',
              compat.status === 'fail' ? 'text-red-500' : compat.status === 'warn' ? 'text-amber-500' : 'text-emerald-600')}>
              {compat.status === 'fail' ? t('builder.compatFailN', { n: compat.fails })
                : compat.status === 'warn' ? t('builder.compatWarnN', { n: compat.warns })
                : t('builder.compatOk')}
            </div>
          </div>
          <button onClick={addAllToCart} disabled={!totals.count}
            className={cx('ml-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer',
              addedAll ? 'bg-emerald-600' : 'bg-brand-600 hover:bg-brand-700')}>
            <Icon name={addedAll ? 'check' : 'cart'} size={16} /> {addedAll ? t('builder.addedAll') : t('builder.addAll')}
          </button>
        </div>
      </div>

      {/* ---------- dialogs ---------- */}
      {picker && !viewingShared && (
        <PartPicker slotKey={picker} candidates={(byCat?.[slotByKey[picker].cat]) || []}
          items={items} byId={byId} defs={defs} t={t} lang={lang}
          onSelect={(p) => pickPart(picker, p)} onClose={() => setPicker(null)} />
      )}
      {myOpen && (
        <MyBuildsDialog t={t} onClose={() => setMyOpen(false)}
          onLoad={(b) => { setItems(b.items || []); setName(b.name); setBudget(b.budget || ''); setBuildId(b.id); setMyOpen(false) }}
          onShare={(b) => { setItems(b.items || []); setName(b.name); setBudget(b.budget || ''); setBuildId(b.id); actions.setLastSaved(b); setMyOpen(false); setShareOpen(true) }} />
      )}
      {shareOpen && actions.lastSaved && (
        <ShareDialog t={t} build={actions.lastSaved} onClose={() => setShareOpen(false)}
          onChanged={(b) => actions.setLastSaved(b)} />
      )}
    </div>
  )
}

// ===================== การ์ดต่อ slot =====================
function SlotCard({ slot, items, byId, issues, loading, readOnly, t, onPick, onRemove, onQty }) {
  const picked = items.filter((i) => i.slot === slot.key)
  const slotIssues = issues.filter((i) => i.slot === slot.key)
  const level = slotIssues.some((i) => i.level === 'fail') ? 'fail' : slotIssues.some((i) => i.level === 'warn') ? 'warn' : null

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <span className="skeleton h-6 w-6 rounded" aria-hidden="true" />
        <span className="skeleton h-4 w-40 rounded" aria-hidden="true" />
        <span className="skeleton ml-auto h-8 w-20 rounded-lg" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={cx('rounded-xl border bg-surface p-4',
      level === 'fail' ? 'border-red-400/60' : level === 'warn' ? 'border-amber-400/60' : 'border-line')}>
      <div className="flex items-center gap-2">
        <Icon name={slot.icon} size={20} className="shrink-0 text-brand-600" />
        <span className="font-semibold">{t(`builder.slot.${slot.key}`)}</span>
        {level && (
          <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold',
            level === 'fail' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400')}>
            {level === 'fail' ? t('builder.groupBlocked') : t('builder.groupWarn')}
          </span>
        )}
        {!readOnly && (!picked.length || (slot.multi && picked.length < (slot.maxItems || 4))) && (
          <button onClick={onPick}
            className="ml-auto flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface2 cursor-pointer">
            <Icon name="plus" size={14} /> {picked.length ? t('builder.addMore') : t('builder.choose')}
          </button>
        )}
      </div>

      {!picked.length ? (
        <div className="mt-2 pl-8 text-sm text-muted">{t('builder.notChosen')}</div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {picked.map((it) => {
            const p = byId[it.id]
            return (
              <div key={it.id} className="flex items-center gap-3 rounded-lg bg-surface2/60 p-2 pl-2.5">
                {p ? (
                  <>
                    <img src={p.images?.[0] || 'https://placehold.co/80x80/f1f1f4/9ca3af?text=BM'} alt=""
                      loading="lazy" className="h-11 w-11 shrink-0 rounded bg-white object-contain p-0.5" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${p.id}`} className="line-clamp-1 text-sm font-semibold hover:text-brand-600">{p.name}</Link>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="nums font-bold text-brand-600">฿{fmt(p.price * (it.qty || 1))}</span>
                        {p.stock <= 0 && <span className="font-semibold text-red-500">{t('builder.outOfStock')}</span>}
                      </div>
                    </div>
                    {!readOnly && (slot.qty || slot.multi) && (
                      <div className="flex items-center gap-1">
                        <QtyBtn icon="minus" onClick={() => onQty(slot.key, it.id, (it.qty || 1) - 1)} disabled={(it.qty || 1) <= 1} />
                        <span className="nums w-6 text-center text-sm font-bold">{it.qty || 1}</span>
                        <QtyBtn icon="plus" onClick={() => onQty(slot.key, it.id, (it.qty || 1) + 1)} disabled={(it.qty || 1) >= 4} />
                      </div>
                    )}
                    {!readOnly && (
                      <div className="flex items-center">
                        {!slot.multi && (
                          <button onClick={onPick} title={t('builder.change')}
                            className="rounded p-1.5 text-muted transition-colors hover:bg-surface hover:text-brand-600 cursor-pointer">
                            <Icon name="edit" size={15} />
                          </button>
                        )}
                        <button onClick={() => onRemove(slot.key, it.id)} title={t('builder.remove')}
                          className="rounded p-1.5 text-muted transition-colors hover:bg-surface hover:text-red-500 cursor-pointer">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center gap-2 text-sm text-red-500">
                    <Icon name="x" size={15} /> {t('builder.discontinued')}
                    {!readOnly && (
                      <button onClick={() => onRemove(slot.key, it.id)} className="ml-auto rounded p-1.5 text-muted hover:text-red-500 cursor-pointer">
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {/* เหตุผล fail/warn ของ slot นี้ */}
          {slotIssues.filter((i) => i.level !== 'info').map((i, idx) => (
            <div key={idx} className={cx('flex items-start gap-1.5 pl-1 text-xs font-medium',
              i.level === 'fail' ? 'text-red-500' : 'text-amber-500')}>
              <Icon name={i.level === 'fail' ? 'x' : 'shield'} size={13} className="mt-0.5 shrink-0" />
              {t(`builder.rule.${i.code}`, i.params)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QtyBtn({ icon, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="grid h-6 w-6 place-items-center rounded border border-line transition-colors hover:bg-surface disabled:opacity-30 cursor-pointer">
      <Icon name={icon} size={12} />
    </button>
  )
}
