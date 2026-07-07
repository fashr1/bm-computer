import { useEffect, useState } from 'react'

// พิมพ์ข้อความทีละตัวอักษรแล้วลบทีละตัว วนไปเรื่อยๆ ตามอาเรย์ที่ส่งมา
// ขับด้วย JS timer ล้วน ไม่พึ่ง CSS animation - จึงทำงานเหมือนกันทุกเครื่อง/ทุกเบราว์เซอร์
// (เวอร์ชันก่อนหยุดพิมพ์เมื่อ prefers-reduced-motion: reduce ซึ่ง Windows ที่ปิด "Animation effects"
//  จะส่งค่านี้ให้ Chrome/Edge อัตโนมัติ ทำให้ผู้ใช้บางเครื่องเห็นข้อความค้างนิ่งเหมือนพัง)
export default function Typewriter({ phrases = [], typeMs = 55, deleteMs = 30, holdMs = 1400, className = '' }) {
  const list = Array.isArray(phrases) ? phrases : [String(phrases || '')]
  const [text, setText] = useState('')
  const [idx, setIdx] = useState(0)
  const full = list.length ? String(list[idx % list.length]) : ''

  useEffect(() => {
    if (!full) return undefined
    let i = 0
    let deleting = false
    let timer
    const tick = () => {
      i += deleting ? -1 : 1
      setText(full.slice(0, i))
      if (!deleting && i >= full.length) {
        timer = setTimeout(() => { deleting = true; tick() }, holdMs)
        return
      }
      if (deleting && i <= 0) {
        setIdx((x) => (x + 1) % Math.max(list.length, 1))
        return
      }
      timer = setTimeout(tick, deleting ? deleteMs : typeMs)
    }
    timer = setTimeout(tick, typeMs)
    return () => clearTimeout(timer)
    // full เปลี่ยนเมื่อวนไปวลีถัดไปหรือสลับภาษา - รีสตาร์ทรอบพิมพ์ใหม่พอดี
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, typeMs, deleteMs, holdMs])

  return (
    <span className={className}>
      {/* ตัวที่กำลังพิมพ์ซ่อนจาก screen reader (ไม่งั้นถูกอ่านซ้ำทุกตัวอักษร) - ให้อ่านวลีเต็มแทน */}
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{full}</span>
      <span
        className="motion-keep ml-0.5 inline-block w-[2px] animate-[blink_1s_steps(1)_infinite] bg-current align-middle"
        style={{ height: '1em' }} aria-hidden="true" />
    </span>
  )
}
