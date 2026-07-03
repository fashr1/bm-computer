import { Link } from 'react-router-dom'
import { fmt } from '../data/mock'
import { Icon } from '../components/Icons'
import { useLang } from '../i18n/LanguageContext'
import { usePageMeta } from '../lib/usePageMeta'

const wrap = 'mx-auto max-w-[1200px] px-4'

// "จัดสเปคคอม" - ฟีเจอร์เด่นแบบเดียวกับ Solar Calculator ในตัวอย่างชีท
const parts = [
  { key: 'cpu', icon: 'cpu', picked: 'AMD Ryzen 7 7800X3D', price: 13900 },
  { key: 'mb', icon: 'mainboard', picked: 'MSI MAG B650 TOMAHAWK', price: 7490 },
  { key: 'gpu', icon: 'gpu', picked: 'ASUS TUF RTX 4070 SUPER', price: 22900 },
  { key: 'ram', icon: 'ram', picked: 'Corsair DDR5 32GB 6000', price: 3690 },
  { key: 'ssd', icon: 'storage', picked: 'Kingston NV2 2TB', price: 4290 },
  { key: 'psu', icon: 'psu', picked: null, price: 0 },
  { key: 'case', icon: 'case', picked: null, price: 0 },
  { key: 'cooler', icon: 'cooler', picked: null, price: 0 },
]

export default function PCBuilder() {
  const { t } = useLang()
  usePageMeta(t('builder.title'), t('builder.desc'))
  const total = parts.reduce((s, p) => s + p.price, 0)
  const chosen = parts.filter((p) => p.picked).length

  return (
    <div className={`${wrap} py-6`}>
      <nav className="flex gap-1.5 py-3 text-sm text-muted"><Link to="/" className="hover:text-brand-600">{t('list.home')}</Link> / <span className="text-fg">{t('nav.builder')}</span></nav>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name="cpu" className="text-brand-600" /> {t('builder.title')}</h1>
        <p className="text-muted">{t('builder.desc')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Icon name="check" size={18} /> {t('builder.compat')}
          </div>
          {parts.map((p) => (
            <div key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[160px_1fr_auto]">
              <div className="flex items-center gap-2 font-semibold"><Icon name={p.icon} size={20} className="text-brand-600" /> {t(`builder.${p.key}`)}</div>
              <div className="col-span-2 text-muted sm:col-span-1">{p.picked ? <b className="text-fg">{p.picked}</b> : <span>{t('builder.notChosen')}</span>}</div>
              <div className="col-span-2 flex items-center justify-end gap-3 sm:col-span-1">
                {p.picked && <b className="nums text-brand-600">฿{fmt(p.price)}</b>}
                <button className="rounded-lg border border-line px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2 cursor-pointer">{p.picked ? t('builder.change') : t('builder.choose')}</button>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-[150px]">
          <h3 className="mb-3 font-bold">{t('builder.summary')}</h3>
          <Line l={t('builder.chosen')} v={`${chosen}/${parts.length} ${t('builder.pieces')}`} />
          <Line l={t('builder.estPower')} v={`620 ${t('builder.watt')}`} />
          <Line l={t('builder.recPsu')} v="≥ 750W 80+ Gold" />
          <div className="mt-3 flex justify-between border-t border-line pt-4 text-lg font-bold"><span>{t('builder.total')}</span><b className="nums text-brand-600">฿{fmt(total)}</b></div>
          <button className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer">{t('builder.addAll')}</button>
          <button className="mt-2 w-full rounded-xl border border-line py-2.5 text-sm font-semibold transition-colors hover:bg-surface2 cursor-pointer">{t('builder.shareBuild')}</button>
        </aside>
      </div>
    </div>
  )
}

function Line({ l, v }) {
  return <div className="flex justify-between py-1.5 text-sm text-muted"><span>{l}</span><span className="nums text-fg">{v}</span></div>
}
