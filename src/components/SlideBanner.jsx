import { Icon } from './Icons'
import { useLang } from '../i18n/LanguageContext'

// แบนเนอร์สไลด์แบบโค้ด - ใช้เมื่อสไลด์ไม่ใส่รูป (หรือรูปโหลดไม่ขึ้น)
// เนื้อหามาจาก DB (title/link) ตามกฎ dynamic · คมทุกจอเพราะไม่ใช่ bitmap
// hover: มุมทั้งสี่กางออก + แสงกวาดผ่าน + glow ขยาย + ปุ่ม CTA ติดสี
export default function SlideBanner({ s }) {
  const { t } = useLang()
  return (
    <div className="group relative h-full w-full overflow-hidden bg-zinc-950 text-white">
      {/* glow แดงสองมุม - ขยายนุ่มๆ ตอน hover */}
      <span aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl transition-transform duration-700 group-hover:scale-150" />
      <span aria-hidden="true" className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-brand-700/20 blur-3xl transition-transform duration-700 group-hover:scale-150" />
      {/* เส้นกริดจางๆ ให้มีมิติ - เฟดหายตรงขอบด้วย radial mask */}
      <span aria-hidden="true" className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
        }} />
      {/* แสงกวาดผ่านตอน hover */}
      <span aria-hidden="true" className="absolute inset-y-[-40%] left-[-30%] w-1/4 rotate-12 bg-white/10 blur-lg transition-transform duration-700 ease-out group-hover:translate-x-[520%]" />

      {/* เนื้อหาจาก DB */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2.5 px-8 text-center sm:gap-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-widest text-brand-400">
          <Icon name="bolt" size={12} /> {t('home.heroKicker')}
        </span>
        <h3 className="max-w-[24ch] text-xl font-extrabold leading-snug text-brand-500 sm:text-2xl lg:text-3xl">{s.title}</h3>
        {s.link && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-brand-500/60 px-4 py-1.5 text-sm font-bold text-brand-400 transition-colors duration-300 group-hover:border-brand-600 group-hover:bg-brand-600 group-hover:text-white">
            {t('home.shopNow')} <Icon name="arrowRight" size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        )}
      </div>

      {/* วงเล็บมุมทั้งสี่ - กางออกตอน hover */}
      {[
        'left-3 top-3 rounded-tl-lg border-l-2 border-t-2',
        'right-3 top-3 rounded-tr-lg border-r-2 border-t-2',
        'bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2',
        'bottom-3 right-3 rounded-br-lg border-b-2 border-r-2',
      ].map((pos) => (
        <span key={pos} aria-hidden="true"
          className={`absolute h-5 w-5 border-brand-500/50 transition-all duration-500 group-hover:h-9 group-hover:w-9 group-hover:border-brand-500 ${pos}`} />
      ))}
    </div>
  )
}
