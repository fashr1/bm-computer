import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import { cx } from '../lib/ui'
import BrandLogo from './BrandLogo'
import SearchBox from './SearchBox'
import { useTheme } from '../theme/ThemeContext'
import { useLang } from '../i18n/LanguageContext'
import { useAuthNav } from '../auth/useAuthNav'
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
  const { open: openAuth } = useAuthNav()
  const { user, profile, isAdmin, signOut } = useAuth()
  const { categories, loading: catsLoading, catName } = useCatalog()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [cats, setCats] = useState(false)
  const menuRef = useRef(null)
  const catRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false)
      if (catRef.current && !catRef.current.contains(e.target)) setCats(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-zinc-950 text-white shadow-lg shadow-black/20">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
        <button className="grid h-10 w-10 place-items-center rounded-lg text-zinc-300 hover:bg-white/10 md:hidden cursor-pointer"
          aria-label="menu" onClick={() => setOpen((o) => !o)}><Icon name={open ? 'x' : 'menu'} /></button>

        <BrandLogo emblemClass="h-9 sm:h-11" textWrapClass="hidden sm:block" />

        <div className="hidden flex-1 md:block"><SearchBox /></div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleLang} title={t('nav.language')}
            className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer">
            <Icon name="globe" size={18} /><span className="uppercase">{lang}</span>
          </button>
          <ActionBtn onClick={toggle} title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')} aria-label="toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </ActionBtn>

          {/* บัญชี - ล็อกอินแล้วโชว์ avatar ตัวอักษรแรก + จุดเขียว ให้รู้สถานะชัดเจน */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button title={t('nav.account')} onClick={() => setMenu((m) => !m)} aria-label={t('nav.account')}
                className="flex h-10 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-white/10 cursor-pointer">
                <span className="relative">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white ring-2 ring-white/20">
                    {(profile?.full_name || user.email || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" aria-hidden="true" />
                </span>
                <span className="hidden max-w-[110px] truncate text-sm font-semibold text-zinc-200 lg:block">
                  {(profile?.full_name || user.email || '').split(' ')[0]}
                </span>
              </button>
              {menu && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 text-fg shadow-xl">
                  <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 text-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {(profile?.full_name || user.email || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{profile?.full_name || user.email}</div>
                      <div className="truncate text-xs text-muted">{user.email}</div>
                    </div>
                  </div>
                  <MenuItem to="/profile" icon="user" label={t('nav.profile')} onClick={() => setMenu(false)} />
                  {apiEnabled && <MenuItem to="/account" icon="user" label={t('nav.account')} onClick={() => setMenu(false)} />}
                  <MenuItem to="/account/orders" icon="receipt" label={t('nav.myOrders')} onClick={() => setMenu(false)} />
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
        <SearchBox onNavigate={() => setOpen(false)} />
      </div>

      <nav className={cx('border-t border-white/10', open ? 'block' : 'hidden md:block')} aria-label="main">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-2 md:flex-row md:items-center md:px-4">
          {/* หมวดหมู่: dropdown รวมทุกหมวด (จอใหญ่) / รายการเปิดเสมอ (มือถือ) */}
          <div className="relative md:py-0" ref={catRef}>
            <button onClick={() => setCats((v) => !v)}
              className="flex w-full items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-brand-400 transition-colors hover:text-white md:w-auto cursor-pointer">
              <Icon name="grid" size={16} /> {t('nav.categories')}
              <Icon name="chevronDown" size={15} className={cx('transition-transform', cats && 'rotate-180')} />
            </button>
            {cats && (
              <div className="z-50 mt-1 w-full rounded-xl border border-line bg-surface p-2 text-fg shadow-xl md:absolute md:left-0 md:top-11 md:mt-0 md:w-64">
                <div className="flex flex-col gap-1">
                  {catsLoading
                    ? Array.from({ length: 9 }).map((_, i) => <span key={i} className="skeleton m-1 h-9 rounded-lg" aria-hidden="true" />)
                    : categories.map((c) => (
                        <Link key={c.slug} to={`/products?cat=${c.slug}`} onClick={() => { setCats(false); setOpen(false) }}
                          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface2">
                          <Icon name={c.icon || 'box'} size={17} className="shrink-0 text-brand-600" /> <span className="truncate">{catName(c.slug)}</span>
                        </Link>
                      ))}
                </div>
                <Link to="/products" onClick={() => { setCats(false); setOpen(false) }}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-600/15 dark:hover:bg-brand-600/25">
                  {t('nav.allCategories')} <Icon name="arrowRight" size={15} />
                </Link>
              </div>
            )}
          </div>

          <CatLink to="/products" label={t('nav.all')} onClick={() => setOpen(false)} />

          {/* เมนูฟีเจอร์: ดันไปทางขวา แยกจากหมวดหมู่สินค้า (มือถือ: มีเส้นคั่นด้านบน) */}
          <div className="mt-1 flex flex-col gap-1 border-t border-white/10 pt-1 md:mt-0 md:ml-auto md:flex-row md:gap-0 md:border-t-0 md:pt-0">
            <CatLink to="/builder" icon="cpu" label={t('nav.builder')} onClick={() => setOpen(false)} />
            <CatLink to="/community" icon="users" label={t('nav.community')} onClick={() => setOpen(false)} />
            <CatLink to="/track" icon="truck" label={t('nav.track')} onClick={() => setOpen(false)} />
          </div>
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
