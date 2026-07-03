import { useEffect } from 'react'

const BRAND = 'BM Computer | บ้านมีคอม'
const DEFAULT_TITLE = `${BRAND} - ร้านอุปกรณ์คอมพิวเตอร์`

// SEO: ตั้ง <title> + meta description ต่อหน้า (คืนค่า default เมื่อออกจากหน้า)
export function usePageMeta(title, desc) {
  useEffect(() => {
    document.title = title ? `${title} · ${BRAND}` : DEFAULT_TITLE
    if (desc) {
      let m = document.querySelector('meta[name="description"]')
      if (!m) {
        m = document.createElement('meta')
        m.setAttribute('name', 'description')
        document.head.appendChild(m)
      }
      m.setAttribute('content', desc)
    }
    return () => { document.title = DEFAULT_TITLE }
  }, [title, desc])
}
