import { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import BrandLogo from '../components/BrandLogo'
import { Icon } from '../components/Icons'
import { useAuth } from '../auth/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { usePageMeta } from '../lib/usePageMeta'

// หน้า login/register แบบเต็มหน้า (แทน popup modal เดิม) - split layout: แผงแบรนด์ + ฟอร์ม
// จุดเด่นของร้าน (จัดสเปค/รับประกัน/ส่งไว) โชว์ฝั่งซ้ายบนจอใหญ่ ช่วยลดการทิ้งฟอร์ม
export default function AuthPage({ view }) {
  const { t } = useLang()
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const isLogin = view === 'login'
  usePageMeta(isLogin ? t('auth.loginTitle') : t('auth.registerTitle'))

  const redirect = new URLSearchParams(loc.search).get('redirect') || '/'
  const redirectQS = redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''

  // ล็อกอินอยู่แล้ว -> เด้งไปหน้าปลายทางทันที (กันเปิด /login ทั้งที่ล็อกอินแล้ว)
  useEffect(() => {
    if (!loading && user) nav(redirect, { replace: true })
  }, [loading, user, redirect, nav])

  const setView = (v) => nav(`/${v === 'register' ? 'register' : 'login'}${redirectQS}`)
  const onClose = () => nav(redirect, { replace: true })

  const perks = [
    { icon: 'cpu', title: t('auth.perkBuildTitle'), desc: t('auth.perkBuildDesc') },
    { icon: 'shield', title: t('auth.perkWarrantyTitle'), desc: t('auth.perkWarrantyDesc') },
    { icon: 'truck', title: t('auth.perkShipTitle'), desc: t('auth.perkShipDesc') },
  ]

  return (
    <div className="mx-auto grid max-w-[1100px] gap-8 px-4 py-8 lg:grid-cols-2 lg:items-center lg:py-14">
      {/* แผงแบรนด์ (จอใหญ่) */}
      <aside className="hidden flex-col justify-center rounded-3xl bg-gradient-to-br from-zinc-900 to-brand-700 p-10 text-white lg:flex">
        <BrandLogo emblemClass="h-12" to={null} />
        <h2 className="mt-8 text-2xl font-bold leading-snug">{t('auth.heroTitle')}</h2>
        <p className="mt-2 text-sm text-zinc-300">{t('auth.heroSub')}</p>
        <ul className="mt-8 flex flex-col gap-5">
          {perks.map((p) => (
            <li key={p.icon} className="flex items-start gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <Icon name={p.icon} size={20} />
              </span>
              <div>
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-zinc-300">{p.desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ฟอร์ม */}
      <div className="w-full">
        <div className="mx-auto max-w-[440px]">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
            <Icon name="chevronLeft" size={16} /> {t('auth.backHome')}
          </Link>
          <AuthForm view={view} setView={setView} onClose={onClose} redirectTo={redirect} />
        </div>
      </div>
    </div>
  )
}
