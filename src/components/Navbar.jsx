import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import { cx } from '../lib/ui'
import BrandLogo from './BrandLogo'
import { useTheme } from '../theme/ThemeContext'
import { useLang } from '../i18n/LanguageContext'
import { useAuthModal } from './AuthModal'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { useCatalog } from '../catalog/CatalogContext'
import { apiEnabled } from '../lib/apiClient'

function ActionBtn({ children, ...rest }) {
  return (
    <button className="relative grid h-10 w-10 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer" {...rest}>
      {children}
    </button>
  )
}

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const { lang, toggle: toggleLang, t } = useLang()
  const { open: openAuth } = useAuthModal()
  const { user, profile, isAdmin, signOut } = useAuth()
  const { categories, loading: catsLoading, catName } = useCatalog()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const searchSubmit = (e) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim()
    nav(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-zinc-950 text-white shadow-lg shadow-black/20">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
        <button className="grid h-10 w-10 place-items-center rounded-lg text-zinc-300 hover:bg-white/10 md:hidden cursor-pointer"
          aria-label="menu" onClick={() => setOpen((o) => !o)}><Icon name={open ? 'x' : 'menu'} /></button>

        <BrandLogo emblemClass="h-9 sm:h-11" textWrapClass="hidden sm:block" />

        <form className="hidden flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:flex" role="search" onSubmit={searchSubmit}>
          <Icon name="search" size={18} className="text-zinc-400" />
          <input name="q" className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none" placeholder={t('common.search')} aria-label={t('common.search')} />
        </form>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleLang} title={t('nav.language')}
            className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer">
            <Icon name="globe" size={18} /><span className="uppercase">{lang}</span>
          </button>
          <ActionBtn onClick={toggle} title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')} aria-label="toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </ActionBtn>

          {/* บัญชี */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <ActionBtn title={t('nav.account')} onClick={() => setMenu((m) => !m)}><Icon name="user" /></ActionBtn>
              {menu && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 text-fg shadow-xl">
                  <div className="border-b border-line px-4 py-2 text-sm">
                    <div className="truncate font-semibold">{profile?.full_name || user.email}</div>
                    <div className="truncate text-xs text-muted">{user.email}</div>
                  </div>
                  {apiEnabled && <MenuItem to="/account" icon="user" label={t('nav.account')} onClick={() => setMenu(false)} />}
                  <MenuItem to="/orders" icon="receipt" label={t('nav.myOrders')} onClick={() => setMenu(false)} />
                  {apiEnabled && <MenuItem to="/account/wishlist" icon="heart" label={t('nav.wishlist')} onClick={() => setMenu(false)} />}
                  {isAdmin && <MenuItem to="/admin" icon="grid" label={t('nav.admin')} onClick={() => setMenu(false)} />}
                  <button onClick={() => { setMenu(false); signOut(); nav('/') }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-brand-600 transition-colors hover:bg-surface2 cursor-pointer">
                    <Icon name="x" size={16} /> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ActionBtn title={t('nav.login')} onClick={() => openAuth('login')}><Icon name="user" /></ActionBtn>
          )}

          <Link to="/cart">
            <ActionBtn title={t('nav.cart')}>
              <Icon name="cart" />
              {count > 0 && <span className="absolute right-1 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{count}</span>}
            </ActionBtn>
          </Link>
        </div>
      </div>

      {/* ค้นหา (mobile) */}
      <div className="border-t border-white/10 px-4 py-2.5 md:hidden">
        <form className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2" role="search" onSubmit={searchSubmit}>
          <Icon name="search" size={18} className="text-zinc-400" />
          <input name="q" className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none" placeholder={t('common.search')} />
        </form>
      </div>

      <nav className={cx('border-t border-white/10', open ? 'block' : 'hidden md:block')} aria-label="categories">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-1 overflow-x-auto px-2 md:flex-row md:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CatLink to="/products" label={t('nav.all')} accent onClick={() => setOpen(false)} />
          {catsLoading
            ? Array.from({ length: 8 }).map((_, i) => <span key={i} className="skeleton mx-3 my-3 h-4 w-16 shrink-0 bg-white/10" aria-hidden="true" />)
            : categories.map((c) => (
                <CatLink key={c.slug} to={`/products?cat=${c.slug}`} icon={c.icon || 'box'} label={catName(c.slug)} onClick={() => setOpen(false)} />
              ))}
          <CatLink to="/builder" icon="cpu" label={t('nav.builder')} onClick={() => setOpen(false)} />
        </div>
      </nav>
    </header>
  )
}

function MenuItem({ to, icon, label, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-surface2">
      <Icon name={icon} size={16} /> {label}
    </Link>
  )
}

function CatLink({ to, label, icon, accent, onClick }) {
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) => cx(
        'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
        accent ? 'text-brand-400' : 'text-zinc-300',
        isActive ? 'border-brand-500 text-white' : 'border-transparent hover:text-white',
      )}>
      {icon && <Icon name={icon} size={16} />}{label}
    </NavLink>
  )
}
