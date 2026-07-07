import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icons'
import { cx } from '../lib/ui'
import SlideBanner from './SlideBanner'

// สไลด์เดี่ยว: มีรูป = โชว์รูป · ไม่มีรูป/รูปโหลดพัง = แบนเนอร์แบบโค้ด (SlideBanner)
// แสดงภาพอย่างเดียว ไม่เป็นลิงก์ - คลิกบนแบนเนอร์ต้องไม่พาไปหน้าอื่น (ลูกศร/จุดใช้เปลี่ยนสไลด์)
function Slide({ s }) {
  const [broken, setBroken] = useState(false)
  return s.image_url && !broken
    ? <img src={s.image_url} alt={s.title || ''} className="h-full w-full object-cover" loading="eager" onError={() => setBroken(true)} />
    : <SlideBanner />
}

// แบนเนอร์เลื่อนอัตโนมัติ (เคารพ prefers-reduced-motion) + ปุ่ม/จุด
export default function HeroCarousel({ slides }) {
  const [i, setI] = useState(0)
  const timer = useRef(null)
  const n = slides.length
  const go = (d) => setI((x) => (x + d + n) % n)

  useEffect(() => {
    if (n <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timer.current = setInterval(() => setI((x) => (x + 1) % n), 5000)
    return () => clearInterval(timer.current)
  }, [n])

  const pause = () => clearInterval(timer.current)

  if (!n) return <div className="skeleton aspect-[1200/440] rounded-2xl" aria-hidden="true" />

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface2" onMouseEnter={pause}
      onMouseLeave={() => { if (n > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer.current = setInterval(() => setI((x) => (x + 1) % n), 5000) }}>
      <div className="aspect-[1200/440]">
        {slides.map((s, idx) => (
          // visibility ซ่อนสไลด์ที่เฟดจบแล้ว - เบราว์เซอร์ไม่ต้องวาดชั้นที่มองไม่เห็นทิ้งไว้
          // (ลดภาพกระตุกบนเครื่อง GPU อ่อน) ส่วน transition ยังครอสเฟดนุ่มเหมือนเดิม
          <div key={s.id || idx}
            className={cx('absolute inset-0 transition-[opacity,visibility] duration-500',
              idx === i ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0')}>
            <Slide s={s} />
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="prev"
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60 cursor-pointer"><Icon name="chevronLeft" /></button>
          <button onClick={() => go(1)} aria-label="next"
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60 cursor-pointer"><Icon name="chevronRight" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`slide ${idx + 1}`}
                className={cx('h-2 rounded-full transition-all', idx === i ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80')} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
