import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fmt } from '../data/mock'
import { Icon } from '../components/Icons'
import { cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../auth/AuthContext'
import { useAuthNav } from '../auth/useAuthNav'
import { createOrder, fetchSetting } from '../lib/api'
import { api, apiEnabled, ApiError } from '../lib/apiClient'
import { useFetch } from '../lib/useFetch'
import { promptpayQrUrl } from '../lib/promptpay'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'
const input = 'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export default function Checkout() {
  const { t } = useLang()
  const { items, subtotal, shipping, total, clear } = useCart()
  usePageMeta(t('cart.checkout'))
  const { user, profile } = useAuth()
  const { open: openAuth } = useAuthNav()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(null) // ออเดอร์ที่สร้างแล้ว (เข้าสู่ขั้นชำระเงิน)
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))

  useEffect(() => {
    if (profile) setForm((s) => ({ ...s, name: s.name || profile.full_name || '', phone: s.phone || profile.phone || '' }))
  }, [profile])

  if (!placed && items.length === 0) {
    return (
      <div className={`${wrap} py-16`}>
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-surface2 text-muted"><Icon name="cart" size={30} /></div>
          <h2 className="text-xl font-bold">{t('cart.empty')}</h2>
          <Link to="/products" className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700">{t('list.products')}</Link>
        </div>
      </div>
    )
  }

  async function placeOrder() {
    setError('')
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) { setError(t('checkout.fillAddress')); return }
    if (!user) { openAuth('login'); return }
    setLoading(true)
    try {
      const order = await createOrder({ userId: user.id, items: items.map((i) => ({ slug: i.slug, qty: i.qty })), ship: form })
      setPlaced(order)
    } catch (e) {
      setError(e.message || t('checkout.orderFail'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${wrap} py-6`}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Step n={<Icon name="check" size={14} />} label={t('checkout.stepCart')} state="done" />
        <Step n={placed ? <Icon name="check" size={14} /> : '2'} label={t('checkout.stepInfo')} state={placed ? 'done' : 'active'} />
        <Step n="3" label={t('checkout.stepDone')} state={placed ? 'active' : ''} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          {!placed ? (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-4 font-bold">{t('checkout.address')}</h3>
              <div className="flex flex-wrap gap-4">
                <div className="min-w-[200px] flex-1"><label className="mb-1.5 block text-sm font-semibold">{t('checkout.name')}</label><input className={input} value={form.name} onChange={set('name')} autoComplete="name" /></div>
                <div className="min-w-[200px] flex-1"><label className="mb-1.5 block text-sm font-semibold">{t('checkout.phone')}</label><input className={input} value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" /></div>
              </div>
              <div className="mt-4"><label className="mb-1.5 block text-sm font-semibold">{t('checkout.addr')}</label><textarea className={input} rows="3" value={form.address} onChange={set('address')} placeholder={t('checkout.addrPlaceholder')} /></div>
              {error && <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>}
              <button onClick={placeOrder} disabled={loading} className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60 cursor-pointer">
                {loading ? t('checkout.placing') : !user ? t('checkout.loginToOrder') : t('checkout.confirm')}
              </button>
            </section>
          ) : (
            <PaymentStep order={placed} onPaid={() => { clear(); nav(`/track?order=${placed.code}`) }} />
          )}
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-[150px]">
          <h3 className="mb-3 font-bold">{t('checkout.yourOrder')}</h3>
          {items.map((it) => (
            <div key={it.slug} className="flex justify-between gap-2 py-1.5 text-sm text-muted"><span className="truncate">{it.name} ×{it.qty}</span><span className="nums shrink-0 text-fg">฿{fmt(it.price * it.qty)}</span></div>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-sm text-muted"><span>{t('cart.subtotal')}</span><span className="nums text-fg">฿{fmt(subtotal)}</span></div>
          <div className="flex justify-between py-1.5 text-sm text-muted"><span>{t('cart.shipping')}</span><span>{shipping === 0 ? <b className="text-emerald-600 dark:text-emerald-400">{t('common.free')}</b> : `฿${fmt(shipping)}`}</span></div>
          <div className="mt-1 flex justify-between border-t border-line pt-3 text-lg font-bold"><span>{t('cart.total')}</span><b className="nums text-brand-600">฿{fmt(placed ? placed.total : total)}</b></div>
          {!placed && <Link to="/cart" className="mt-3 block py-2 text-center text-sm text-muted hover:text-fg">{t('checkout.backToCart')}</Link>}
        </aside>
      </div>
    </div>
  )
}

function PaymentStep({ order, onPaid }) {
  const { t } = useLang()
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const { data: pay } = useFetch(() => fetchSetting('payment'), [])
  const qr = pay?.promptpay_id ? promptpayQrUrl(pay.promptpay_id, order.total) : ''

  async function verify() {
    if (!file) { setError(t('checkout.chooseSlip')); return }
    setBusy(true); setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('orderCode', order.code)
      // verify-slip ต้องใช้ service_role (server-trust กันปลอมสถานะจ่าย)
      // โหมด API: ผ่าน worker /api/payments/verify-slip · fallback: Pages Function /api/verify-slip
      if (apiEnabled) {
        const data = await api.postForm('/api/payments/verify-slip', fd)
        if (data.ok) onPaid()
        else setError(data.error || t('checkout.verifyFail'))
      } else {
        const res = await fetch('/api/verify-slip', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.ok) onPaid()
        else setError(data.error || t('checkout.verifyFail'))
      }
    } catch (e) {
      // ApiError = server ตอบมาพร้อมข้อความจริง (เช่น สลิปซ้ำ/ยอดไม่พอ) · อื่นๆ = ต่อไม่ได้
      setError(e instanceof ApiError ? e.message : t('checkout.verifyConn'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-600/10 dark:text-brand-400">
        {t('checkout.orderCreated')} · {t('checkout.orderNo')} <b>#{order.code}</b>
      </div>
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-brand-600 bg-brand-50 p-4 text-center dark:bg-brand-600/10">
          <div className="flex items-center gap-2 text-sm font-bold"><Icon name="qr" size={18} className="text-brand-600" /> {t('checkout.promptpay')}</div>
          {qr ? (
            <>
              <img src={qr} alt="PromptPay QR" width="180" height="180" className="rounded-lg bg-white p-2" />
              {pay?.name && <div className="text-xs font-semibold">{pay.name}</div>}
              <div className="nums text-xl font-bold text-brand-600">฿{fmt(order.total)}</div>
              <div className="text-xs text-muted">{t('checkout.scanToPay')}</div>
            </>
          ) : (
            <div className="py-6 text-sm text-muted">{t('checkout.noPayAccount')}<br />{t('checkout.contactShop')}</div>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-bold">{t('checkout.uploadSlip')}</h3>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { setFile(e.target.files?.[0] || null); setError('') }} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-6 text-sm font-semibold text-muted transition-colors hover:border-brand-400 hover:text-brand-600 cursor-pointer">
            <Icon name="image" size={20} /> {file ? file.name : t('checkout.chooseSlip')}
          </button>
          {error && <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>}
          <button onClick={verify} disabled={busy || !file} className="mt-3 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60 cursor-pointer">
            {busy ? t('checkout.verifying') : t('checkout.verifyPay')}
          </button>
          <p className="mt-2 text-xs text-muted">{t('checkout.qrDemo')}</p>
        </div>
      </div>
    </section>
  )
}

function Step({ n, label, state }) {
  return (
    <div className={cx('flex items-center gap-2 text-sm', state ? 'font-semibold text-fg' : 'text-muted')}>
      <span className={cx('grid h-7 w-7 place-items-center rounded-full text-xs font-bold',
        state === 'done' ? 'bg-emerald-600 text-white' : state === 'active' ? 'bg-brand-600 text-white' : 'bg-surface2 text-muted')}>{n}</span>
      {label}
    </div>
  )
}
