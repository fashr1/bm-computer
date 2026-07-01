import { useState } from 'react'
import { IconGoogle, Icon } from './Icons'
import { useLang } from '../i18n/LanguageContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Turnstile, { turnstileEnabled } from './Turnstile'

const input = 'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

// เกณฑ์: อย่างน้อย 8 ตัว + มีตัวเลข + มีอักขระพิเศษ
function checkPw(pw) {
  const len = pw.length >= 8
  const num = /\d/.test(pw)
  const special = /[^A-Za-z0-9]/.test(pw)
  const met = [len, num, special].filter(Boolean).length
  return { len, num, special, met, valid: len && num && special }
}

export default function AuthForm({ view, setView, onClose }) {
  const { t } = useLang()
  const isLogin = view === 'login'
  const [f, setF] = useState({ fullName: '', phone: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [gLoading, setGLoading] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const pw = checkPw(f.password)
  const mismatch = !isLogin && f.confirm.length > 0 && f.password !== f.confirm
  const baseValid = isLogin ? f.email && f.password : (f.fullName && f.phone && f.email && pw.valid && !mismatch)
  const canSubmit = baseValid && (!turnstileEnabled || captcha)

  const level = pw.met <= 1 ? 0 : pw.met === 2 ? 1 : 2
  const levelLabel = [t('auth.pwWeak'), t('auth.pwMid'), t('auth.pwStrong')][level]
  const levelColor = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500'][level]

  async function submit(e) {
    e.preventDefault()
    setError(''); setOk('')
    if (!canSubmit) return
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้เชื่อม Supabase (ใส่ VITE_SUPABASE_ANON_KEY ใน .env.local)')
      return
    }
    setLoading(true)
    try {
      const captchaOpt = turnstileEnabled ? { captchaToken: captcha } : {}
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password, options: captchaOpt })
        if (error) throw error
        onClose?.()
      } else {
        const { error } = await supabase.auth.signUp({
          email: f.email, password: f.password,
          options: { data: { full_name: f.fullName, phone: f.phone }, ...captchaOpt },
        })
        if (error) throw error
        setOk('สมัครสำเร็จ! ตรวจอีเมลเพื่อยืนยัน (ถ้าเปิด confirm email ไว้)')
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด')
      setCaptcha(''); setResetKey((k) => k + 1) // รีเซ็ต Turnstile ให้ลองใหม่
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    if (!isSupabaseConfigured) { setError('ยังไม่ได้เชื่อม Supabase'); return }
    setError(''); setGLoading(true)
    // เก็บ path ปัจจุบันไว้ กลับมาหน้าเดิมหลังล็อกอินสำเร็จ
    const back = window.location.pathname + window.location.search
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + back,
        queryParams: { prompt: 'select_account' }, // ให้เลือกบัญชี Google ได้ทุกครั้ง
      },
    })
    // ถ้าสำเร็จ เบราว์เซอร์จะ redirect ออกไปเอง โค้ดข้างล่างรันเฉพาะตอน error
    if (error) { setError(error.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'); setGLoading(false) }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-7 shadow-2xl">
      <div className="mb-5 text-center">
        <h2 className="text-xl font-bold">{isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{isLogin ? t('auth.loginSub') : t('auth.registerSub')}</p>
      </div>

      <button onClick={google} disabled={gLoading} className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface py-3 font-semibold transition-colors hover:bg-surface2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
        {gLoading ? <Icon name="loader" size={18} className="animate-spin" /> : <IconGoogle />}
        {gLoading ? t('common.loading') : isLogin ? t('auth.googleLogin') : t('auth.googleRegister')}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        {isLogin ? t('auth.orEmail') : t('auth.orEmailReg')}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>}
      {ok && <div className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">{ok}</div>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        {!isLogin && (
          <>
            <div><label className="mb-1.5 block text-sm font-semibold">{t('auth.fullName')}</label><input className={input} value={f.fullName} onChange={set('fullName')} autoComplete="name" /></div>
            <div><label className="mb-1.5 block text-sm font-semibold">{t('auth.phone')}</label><input className={input} value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" /></div>
          </>
        )}
        <div><label className="mb-1.5 block text-sm font-semibold">{t('auth.email')}</label><input className={input} value={f.email} onChange={set('email')} type="email" placeholder="you@email.com" autoComplete="email" /></div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-semibold">{t('auth.password')}</label>
            {isLogin && <a href="#" className="text-sm text-brand-600 hover:underline">{t('auth.forgot')}</a>}
          </div>
          <input className={input} value={f.password} onChange={set('password')} type="password" placeholder="••••••••" autoComplete={isLogin ? 'current-password' : 'new-password'} />

          {!isLogin && f.password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? levelColor : 'bg-line'}`} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-muted">{t('auth.strength')}</span>
                <span className={['text-red-500', 'text-amber-500', 'text-emerald-500'][level]}>{levelLabel}</span>
              </div>
              <ul className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-3">
                <Req ok={pw.len} label={t('auth.reqLen')} />
                <Req ok={pw.num} label={t('auth.reqNum')} />
                <Req ok={pw.special} label={t('auth.reqSpecial')} />
              </ul>
            </div>
          )}
        </div>

        {!isLogin && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{t('auth.confirmPassword')}</label>
            <input className={input} value={f.confirm} onChange={set('confirm')} type="password" placeholder="••••••••" autoComplete="new-password" />
            {mismatch && <span className="mt-1 block text-xs text-red-500">{t('auth.pwMismatch')}</span>}
          </div>
        )}

        {isLogin && <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" /> {t('auth.remember')}</label>}

        <Turnstile key={`${view}-${resetKey}`} onToken={setCaptcha} />

        <button disabled={!canSubmit || loading} className="rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {loading ? t('common.loading') : isLogin ? t('auth.signin') : t('auth.signup')}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
        <button onClick={() => { setError(''); setOk(''); setView(isLogin ? 'register' : 'login') }} className="font-semibold text-brand-600 hover:underline cursor-pointer">
          {isLogin ? t('auth.signup') : t('auth.signin')}
        </button>
      </p>
    </div>
  )
}

function Req({ ok, label }) {
  return (
    <li className={`flex items-center gap-1 ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'}`}>
      <Icon name={ok ? 'check' : 'x'} size={13} /> {label}
    </li>
  )
}
