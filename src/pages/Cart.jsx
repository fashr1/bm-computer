import { Link } from 'react-router-dom'
import { fmt } from '../data/mock'
import { Icon } from '../components/Icons'
import { useLang } from '../i18n/LanguageContext'
import { useCart } from '../cart/CartContext'
import { useCatalog } from '../catalog/CatalogContext'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'
const PH = 'https://placehold.co/200x200/f1f1f4/9ca3af?text=BM'

export default function Cart() {
  const { t } = useLang()
  const { catName } = useCatalog()
  const { items, setQty, remove, subtotal, shipping, total } = useCart()
  usePageMeta(t('cart.title'))

  if (items.length === 0) {
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

  return (
    <div className={`${wrap} py-6`}>
      <nav className="flex gap-1.5 py-3 text-sm text-muted"><Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> / <span className="text-fg">{t('cart.title')}</span></nav>
      <h1 className="mb-5 text-2xl font-bold">{t('cart.title')} ({items.length})</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <div key={it.slug} className="grid grid-cols-[80px_1fr] items-center gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[90px_1fr_auto]">
              <Link to={`/product/${it.slug}`} className="overflow-hidden rounded-lg bg-white">
                <img src={it.image || PH} alt={it.name} className="aspect-square w-full object-contain p-1" onError={(e) => { e.currentTarget.src = PH }} />
              </Link>
              <div>
                <Link to={`/product/${it.slug}`} className="font-semibold hover:text-brand-600">{it.name}</Link>
                <div className="text-sm text-muted">{it.cat ? catName(it.cat) : ''} {it.brand ? `· ${it.brand}` : ''}</div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="inline-flex items-center overflow-hidden rounded-lg border border-line">
                    <button onClick={() => setQty(it.slug, it.qty - 1)} className="grid h-9 w-9 place-items-center hover:bg-surface2 cursor-pointer" aria-label="-"><Icon name="minus" size={14} /></button>
                    <span className="nums w-10 text-center text-sm">{it.qty}</span>
                    <button onClick={() => setQty(it.slug, it.qty + 1)} className="grid h-9 w-9 place-items-center hover:bg-surface2 cursor-pointer" aria-label="+"><Icon name="plus" size={14} /></button>
                  </div>
                  <button onClick={() => remove(it.slug)} className="flex items-center gap-1 text-sm text-brand-600 hover:underline cursor-pointer"><Icon name="trash" size={15} /> {t('cart.remove')}</button>
                </div>
              </div>
              <div className="col-span-2 text-right sm:col-span-1">
                <div className="nums font-bold text-brand-600">฿{fmt(it.price * it.qty)}</div>
                {it.old && <div className="nums text-xs text-zinc-400 line-through">฿{fmt(it.old * it.qty)}</div>}
              </div>
            </div>
          ))}
          <Link to="/products" className="w-fit rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface2">{t('cart.continue')}</Link>
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-[150px]">
          <h3 className="mb-3 font-bold">{t('cart.summary')}</h3>
          <Line l={t('cart.subtotal')} v={`฿${fmt(subtotal)}`} />
          <Line l={t('cart.shipping')} v={shipping === 0 ? <b className="text-emerald-600 dark:text-emerald-400">{t('common.free')}</b> : `฿${fmt(shipping)}`} />
          <div className="mt-3 flex justify-between border-t border-line pt-4 text-lg font-bold"><span>{t('cart.total')}</span><b className="nums text-brand-600">฿{fmt(total)}</b></div>
          <Link to="/checkout" className="mt-4 block rounded-xl bg-brand-600 py-3 text-center font-semibold text-white transition-colors hover:bg-brand-700">{t('cart.checkout')}</Link>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted"><Icon name="lock" size={13} /> {t('cart.secure')}</p>
        </aside>
      </div>
    </div>
  )
}

function Line({ l, v }) {
  return <div className="flex justify-between py-1.5 text-sm text-muted"><span>{l}</span><span className="nums text-fg">{v}</span></div>
}
