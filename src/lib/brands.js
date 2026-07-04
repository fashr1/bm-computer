// map slug -> Simple Icons slug เพื่อดึงโลโก้แบรนด์จริง (SVG) จาก cdn.simpleicons.org
// ถ้าไม่มีใน map จะ fallback ไป logo_url จาก DB (ตั้งเป็นโลโก้จริงไว้แล้ว) แล้วค่อยเป็นชื่อแบรนด์
// (ตรวจ slug ที่มีจริงบน Simple Icons แล้ว - อันที่ไม่มีจะพึ่ง logo_url แทน)
const ICON = {
  amd: 'amd', intel: 'intel', nvidia: 'nvidia', asus: 'asus', msi: 'msibusiness',
  corsair: 'corsair', kingston: 'kingstontechnology', samsung: 'samsung', lg: 'lg',
  acer: 'acer', lenovo: 'lenovo', razer: 'razer', seagate: 'seagate', tplink: 'tplink',
  hp: 'hp', dell: 'dell', apple: 'apple', steelseries: 'steelseries', hyperx: 'hyperx',
  nzxt: 'nzxt', coolermaster: 'coolermaster', deepcool: 'deepcool',
}

// โลโก้จริง (fallback ไป logo_url จาก DB ถ้าไม่มี mapping)
export function brandLogo(slug, fallback) {
  const s = ICON[slug]
  return s ? `https://cdn.simpleicons.org/${s}` : (fallback || '')
}
