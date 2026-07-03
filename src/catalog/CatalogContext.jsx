import { createContext, useContext, useMemo } from 'react'
import { fetchCategories } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useLang } from '../i18n/LanguageContext'

// หมวดหมู่ทั้งเว็บมาจาก DB (ตาราง categories) - โหลดครั้งเดียวแชร์ทุกคอมโพเนนต์
// เพิ่ม/แก้หมวดในหลังบ้าน -> nav/กริดหมวด/ชื่อบนการ์ด อัปเดตเองทันที (กฎ dynamic)
const Ctx = createContext({ categories: [], loading: true, catName: (s) => s || '', catIcon: () => 'box' })
export const useCatalog = () => useContext(Ctx)

export function CatalogProvider({ children }) {
  const { lang } = useLang()
  const { data, loading } = useFetch(() => fetchCategories(), [])

  const value = useMemo(() => {
    const categories = data || []
    const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]))
    return {
      categories,
      loading,
      // ชื่อหมวดตามภาษา - ระหว่างโหลดคืน '' กันโชว์ slug ดิบแวบหนึ่ง
      catName: (slug) => {
        const c = bySlug[slug]
        if (c) return lang === 'th' ? c.name_th : c.name_en
        return loading ? '' : (slug || '')
      },
      catIcon: (slug) => bySlug[slug]?.icon || 'box',
    }
  }, [data, loading, lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
