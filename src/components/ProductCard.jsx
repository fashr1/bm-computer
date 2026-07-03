import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt } from '../data/mock'
import { Icon } from './Icons'
import { badgeMap, badgeLabel, cx } from '../lib/ui'
import { useLang } from '../i18n/LanguageContext'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../auth/AuthContext'
import { useWishlist } from '../wishlist/WishlistContext'
import { useAuthModal } from './AuthModal'
import { useCatalog } from '../catalog/CatalogContext'

export default function ProductCard({ p }) {
  const { lang, t } = useLang()
  const { catName } = useCatalog()
  const { add } = useCart()
  const { user } = useAuth()
  const wl = useWishlist()
  const { open: openAuth } = useAuthModal()
  const [added, setAdded] = useState(false)
  const b = p.badge ? badgeMap[p.badge] : null
  const liked = wl?.has(p.id)

  const addToCart = () => {
    if (!user) { openAuth('login'); return }
    add(p, 1); setAdded(true); setTimeout(() => setAdded(false), 1200)
  }

  const toggleLike = async () => {
    const ok = await wl?.toggle(p.id)
    if (!ok) openAuth('login')
  }

  return (
    <article className="card-hover group/card flex flex-col overflow-hidden rounded-2xl border border-line bg-surface hover:border-zinc-300 hover:shadow-xl hover:shadow-black/5 dark:hover:border-zinc-700">
      <div className="relative">
        <Link to={`/product/${p.id}`} className="block">
          {p.images?.[0]
            ? <img src={p.images[0]} alt={p.name} loading="lazy" className="aspect-square w-full bg-white object-contain p-3"
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x600/f1f1f4/9ca3af?text=BM+Computer' }} />
            : <div className="ph grid aspect-square place-items-center text-zinc-400"><Icon name="image" size={40} /></div>}
        </Link>
        {p.discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white">-{p.discount}%</span>}
        {b && <span className={cx('absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold', b.cls)}>{badgeLabel[lang][p.badge]}</span>}
        {wl?.enabled && (
          <button onClick={toggleLike} aria-label={t('account.wishlist')} title={t('account.wishlist')}
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface/90 shadow-sm backdrop-blur transition-colors hover:bg-surface cursor-pointer">
            <Icon name="heart" size={18} className={liked ? 'text-brand-600' : 'text-muted'} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-xs text-muted">{catName(p.cat)} · {p.brand}</span>
        <Link to={`/product/${p.id}`} className="line-clamp-2 min-h-[2.6em] text-sm font-semibold leading-snug transition-colors group-hover/card:text-brand-600">{p.name}</Link>
        <span className="flex items-center gap-1 text-xs text-amber-500">★ {p.rating} <span className="text-muted">({p.reviews})</span></span>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="nums text-lg font-bold text-brand-600">฿{fmt(p.price)}</span>
          {p.old && <span className="nums text-xs text-zinc-400 line-through">฿{fmt(p.old)}</span>}
        </div>
        <span className={cx('text-xs font-semibold', p.stock <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
          {p.stock <= 5 ? t('common.lowStock', { n: p.stock }) : t('common.inStock')}
        </span>
      </div>
      <div className="p-4 pt-0">
        <button onClick={addToCart} disabled={p.stock === 0}
          className={cx('flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50',
            added ? 'bg-emerald-600' : 'bg-brand-600 hover:bg-brand-700')}>
          <Icon name={added ? 'check' : 'cart'} size={16} /> {added ? t('common.added') : t('common.addToCart')}
        </button>
      </div>
    </article>
  )
}
