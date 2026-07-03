import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { usePageMeta } from '../lib/usePageMeta'

export default function NotFound() {
  const { t } = useLang()
  usePageMeta(t('notfound.title'))
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-4 py-20 text-center">
      <div className="text-6xl font-extrabold text-brand-600">404</div>
      <h2 className="text-2xl font-bold">{t('notfound.title')}</h2>
      <p className="text-muted">{t('notfound.desc')}</p>
      <Link to="/" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700">{t('notfound.back')}</Link>
    </div>
  )
}
