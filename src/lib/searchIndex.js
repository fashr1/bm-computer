import { fetchSearchIndex } from './api'

// โหลดดัชนีค้นหาครั้งเดียวแล้วแคชใน module scope (โหลดตอนผู้ใช้โฟกัสช่องค้นหาครั้งแรก
// ไม่ใช่ทุกครั้งที่เปิดเว็บ) - ให้ autocomplete ค้นหา fuzzy ได้ทันทีโดยไม่ยิง network ทุกคีย์
let cache = null
let inflight = null

export function getSearchIndex() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetchSearchIndex()
      .then((items) => { cache = items || []; return cache })
      .catch(() => [])
      .finally(() => { inflight = null })
  }
  return inflight
}
