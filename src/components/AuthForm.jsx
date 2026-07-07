import { useState } from 'react'
import { IconGoogle, Icon } from './Icons'
import { useLang } from '../i18n/LanguageContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { apiEnabled } from '../lib/apiClient'
import { authApi } from '../lib/accountApi'
import { useAuth, OAUTH_FLAG } from '../auth/AuthContext'
import Turnstile, { turnstileEnabled } from './Turnstile'
import { suggestEmailFix, isDisposableEmail } from '../lib/emailCheck'
import { check, MAX } from '../lib/validate'
import { cx } from '../lib/ui'

const input = 'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

// เกณฑ์: อย่างน้อย 8 ตัว + มีตัวเลข + มีอักขระพิเศษ
function checkPw(pw) {
  const len = pw.length >= 8
  const num = /\d/.test(pw)
  const special = /[^A-Za-z0-9]/.test(pw)
  const met = [len, num, special].filter(Boolean).length
  return { len, num, special, met, valid: len && num && special }
}

export default function AuthForm({ view, setView, onClose, redirectTo }) {
  const { t } = useLang()
  const { reload } = useAuth()
  const isLogin = view === 'login'
  const [f, setF] = useState({ fullName: '', phone: '', email: '', password: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [gLoading, setGLoading] = useState(false)
  const set = (k, filter) => (e) => {
    const v = filter ? filter(e.target.value) : e.target.value
    setF((s) => ({ ...s, [k]: v }))
  }
  const blur = (k) => () => setTouched((s) => ({ ...s, [k]: true }))

  const pw = checkPw(f.password)
  const mismatch = !isLogin && f.confirm.length > 0 && f.password !== f.confirm
  // กันอีเมล bounce (สมัครเท่านั้น): โดเมนพิมพ์ผิด -> เสนอแก้ให้กดได้ · อีเมลชั่วคราว -> บล็อก
  const emailSuggest = !isLogin && f.email.includes('@') ? suggestEmailFix(f.email) : null
  const emailDisposable = !isLogin && f.email.includes('@') && isDisposableEmail(f.email)

  // ตรวจรูปแบบรายช่อง (โชว์เมื่อผู้ใช้ออกจากช่องแล้วเท่านั้น - ไม่ด่าตั้งแต่ยังพิมพ์ไม่เสร็จ)
  const fieldErr = {
    fullName: !isLogin && f.fullName ? check('name', f.fullName) : '',
    phone: !isLogin && f.phone ? check('phone', f.phone) : '',
    email: f.email ? check('email', f.email) : '',
  }
  const showErr = (k) => touched[k] && fieldErr[k] ? t(fieldErr[k]) : ''

  const baseValid = isLogin
    ? f.email && f.password && !fieldErr.email
    : f.fullName && f.phone && f.email && pw.valid && !mismatch && !emailDisposable
      && !fieldErr.fullName && !fieldErr.phone && !fieldErr.email
  const canSubmit = baseValid && (!turnstileEnabled || captcha)

  const level = pw.met <= 1 ? 0 : pw.met === 2 ? 1 : 2
  const levelLabel = [t('auth.pwWeak'), t('auth.pwMid'), t('auth.pwStrong')][level]
  const levelColor = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500'][level]

  async function submit(e) {
    e.preventDefault()
    setError(''); setOk('')
    setTouched({ fullName: true, phone: true, email: true })
    if (!canSubmit) return
    setLoading(true)
    try {
      if (!apiEnabled && !isSupabaseConfigured) {
        setError(t('auth.notConfigured'))
        return
      }
      const captchaToken = (turnstileEnabled && captcha) ? captcha : undefined
      if (apiEnabled) {
        // ผ่าน backend: ตั้ง HttpOnly cookie (session สั้น) แล้วโหลดผู้ใช้ใหม่
        if (isLogin) {
          await authApi.login({ email: f.email.trim(), password: f.password, captchaToken, remember })
          await reload()
          onClose?.()
        } else {
          const r = await authApi.register({ email: f.email.trim(), password: f.password, full_name: f.fullName.trim(), phone: f.phone.trim(), captchaToken })
          if (r.needsConfirm) setOk(t('auth.registerOk'))
          else { await reload(); onClose?.() }
        }
      } else {
        // fallback: Supabase ตรง
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
          setOk(t('auth.registerOk'))
        }
      }
    } catch (err) {
      setError(err.message || t('common.error'))
      setCaptcha(''); setResetKey((k) => k + 1) // รีเซ็ต Turnstile ให้ลองใหม่
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    if (!isSupabaseConfigured) { setError(t('auth.notConfigured')); return }
    setError(''); setGLoading(true)
    // ตั้ง flag ให้ตอนกลับมาจาก Google โชว์ overlay "กำลังเข้าสู่ระบบ" (อ่านใน AuthContext)
    try { sessionStorage.setItem(OAUTH_FLAG, '1') } catch { /* ignore */ }
    // เก็บ path ปัจจุบันไว้ กลับมาหน้าเดิมหลังล็อกอินสำเร็จ (หน้า login ส่ง redirectTo มาให้)
    const back = redirectTo || (window.location.pathname + window.location.search)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + back,
        queryParams: { prompt: 'select_account' }, // ให้เลือกบัญชี Google ได้ทุกครั้ง
      },
    })
    // ถ้าสำเร็จ เบราว์เซอร์จะ redirect ออกไปเอง โค้ดข้างล่างรันเฉพาะตอน error
    if (error) {
      try { sessionStorage.removeItem(OAUTH_FLAG) } catch { /* ignore */ }
      setError(error.message || t('auth.googleFail')); setGLoading(false)
    }
  }

  // input + สถานะ error (ขอบแดงเมื่อไม่ผ่าน)
  const cls = (k) => cx(input, showErr(k) ? 'border-red-400' : 'border-line')

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-7">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold">{isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{isLogin ? t('auth.loginSub') : t('auth.registerSub')}</p>
      </div>

      {isSupabaseConfigured && (
        <>
          <button onClick={google} disabled={gLoading} className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface py-2.5 font-semibold transition-colors hover:bg-surface2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
            {gLoading ? <Icon name="loader" size={18} className="spinner" /> : <IconGoogle />}
            {gLoading ? t('auth.googleRedirect') : isLogin ? t('auth.googleLogin') : t('auth.googleRegister')}
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            {isLogin ? t('auth.orEmail') : t('auth.orEmailReg')}
          </div>
        </>
      )}

      {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>}
      {ok && <div className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">{ok}</div>}

      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        {!isLogin && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('auth.fullName')}</label>
              <input className={cls('fullName')} value={f.fullName} onChange={set('fullName')} onBlur={blur('fullName')}
                autoComplete="name" placeholder={t('auth.fullName')} maxLength={MAX.name} />
              {showErr('fullName') && <span className="mt-1 block text-xs text-red-500">{showErr('fullName')}</span>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('auth.phone')}</label>
              <input className={cls('phone')} value={f.phone} onChange={set('phone', (v) => v.replace(/[^\d]/g, ''))} onBlur={blur('phone')}
                type="tel" inputMode="tel" autoComplete="tel" placeholder={t('auth.phone')} maxLength={MAX.phone} />
              {showErr('phone') && <span className="mt-1 block text-xs text-red-500">{showErr('phone')}</span>}
            </div>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-semibold">{t('auth.email')}</label>
          <input className={cls('email')} value={f.email} onChange={set('email')} onBlur={blur('email')}
            type="email" placeholder={t('auth.email')} autoComplete="email" maxLength={MAX.email} />
          {showErr('email') && <span className="mt-1 block text-xs text-red-500">{showErr('email')}</span>}
          {emailSuggest && (
            <button type="button" onClick={() => setF((s) => ({ ...s, email: emailSuggest }))}
              className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 hover:underline dark:text-amber-400 cursor-pointer">
              <Icon name="alert" size={13} /> {t('auth.emailTypo', { email: emailSuggest })}
            </button>
          )}
          {emailDisposable && <span className="mt-1 block text-xs text-red-500">{t('auth.emailDisposable')}</span>}
        </div>

        {isLogin ? (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-semibold">{t('auth.password')}</label>
              <a href="#" className="text-sm text-brand-600 hover:underline">{t('auth.forgot')}</a>
            </div>
            <input className={cx(input, 'border-line')} value={f.password} onChange={set('password')} type="password"
              placeholder={t('auth.password')} autoComplete="current-password" maxLength={MAX.password} />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('auth.password')}</label>
                <input className={cx(input, 'border-line')} value={f.password} onChange={set('password')} type="password"
                  placeholder={t('auth.password')} autoComplete="new-password" maxLength={MAX.password} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('auth.confirmPassword')}</label>
                <input className={cx(input, mismatch ? 'border-red-400' : 'border-line')} value={f.confirm} onChange={set('confirm')} type="password"
                  placeholder={t('auth.confirmPassword')} autoComplete="new-password" maxLength={MAX.password} />
              </div>
            </div>
            {/* แถวความแข็งแรงรหัสผ่าน: จองความสูงตายตัวไว้เสมอ - โผล่/หายโดยฟอร์มไม่ยืดหด */}
            <div className="flex h-5 items-center gap-2 text-xs">
              {f.password.length > 0 && (
                <>
                  <div className="flex w-24 shrink-0 gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= level ? levelColor : 'bg-line')} />
                    ))}
                  </div>
                  <span className={['text-red-500', 'text-amber-500', 'text-emerald-500'][level]}>{levelLabel}</span>
                  <span className="flex items-center gap-2 text-muted">
                    <Req ok={pw.len} label={t('auth.reqLen')} />
                    <Req ok={pw.num} label={t('auth.reqNum')} />
                    <Req ok={pw.special} label={t('auth.reqSpecial')} />
                  </span>
                </>
              )}
              {mismatch && <span className="ml-auto text-red-500">{t('auth.pwMismatch')}</span>}
            </div>
          </>
        )}

        {isLogin && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {t('auth.remember')}
          </label>
        )}

        <Turnstile key={`${view}-${resetKey}`} onToken={setCaptcha} />

        <button disabled={!canSubmit || loading} className="rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {loading ? t('common.loading') : isLogin ? t('auth.signin') : t('auth.signup')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
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
    <span className={cx('flex items-center gap-0.5 whitespace-nowrap', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted')}>
      <Icon name={ok ? 'check' : 'x'} size={11} /> {label}
    </span>
  )
}
