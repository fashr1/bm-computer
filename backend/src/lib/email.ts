// ตรวจอีเมลก่อนส่งให้ Supabase Auth (ลด bounce - Supabase เตือนโปรเจคที่อีเมลตีกลับสูง
// และอาจระงับการส่งอีเมลชั่วคราวถ้าไม่ลดลง)
// 3 ชั้น: โดเมนพิมพ์ผิดที่พบบ่อย -> อีเมลชั่วคราว/ตัวอย่าง -> โดเมนต้องรับเมลได้จริง (MX/A)

// โดเมนพิมพ์ผิดที่พบบ่อย -> โดเมนที่น่าจะตั้งใจพิมพ์
const TYPO_DOMAINS: Record<string, string> = {
  'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gmali.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.om': 'gmail.com', 'gmailc.om': 'gmail.com', 'gmail.co.th': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmil.com': 'hotmail.com',
  'hormail.com': 'hotmail.com', 'hotnail.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'hotmaill.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloook.com': 'outlook.com', 'outlook.co': 'outlook.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'iclould.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icoud.com': 'icloud.com',
}

// อีเมลชั่วคราว/โดเมนตัวอย่าง - ปลายทางเหล่านี้ bounce หรือเป็น spam trap
const DISPOSABLE_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'test.com', 'test.co', 'testing.com',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'tempail.com', 'throwawaymail.com', 'yopmail.com',
  'trashmail.com', 'fakeinbox.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'mintemail.com', 'mohmal.com', 'emailondeck.com', 'spamgourmet.com', 'mytemp.email',
  'localhost', 'localhost.com', 'invalid.com', 'asdf.com', 'aaa.com', 'abc.com',
])

export type EmailCheck = { ok: true } | { ok: false; error: string }

// DNS-over-HTTPS: โดเมนต้องมี MX (หรืออย่างน้อย A/AAAA ตาม RFC 5321 fallback) ถึงจะรับเมลได้
// DNS พัง/ช้า = ปล่อยผ่าน (fail-open) - อย่าบล็อกการสมัครเพราะระบบตรวจล่ม
async function domainAcceptsMail(domain: string): Promise<boolean> {
  const query = async (type: 'MX' | 'A' | 'AAAA') => {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) throw new Error(`dns ${res.status}`)
    return res.json() as Promise<{ Status: number; Answer?: { type: number }[] }>
  }
  try {
    const mx = await query('MX')
    if (Array.isArray(mx.Answer) && mx.Answer.some((a) => a.type === 15)) return true
    // NXDOMAIN = โดเมนไม่มีอยู่จริง ตัดจบได้เลย
    if (mx.Status === 3) return false
    // ไม่มี MX: RFC 5321 อนุญาต fallback ไป A/AAAA
    const a = await query('A')
    if (Array.isArray(a.Answer) && a.Answer.some((r) => r.type === 1)) return true
    const aaaa = await query('AAAA')
    return Array.isArray(aaaa.Answer) && aaaa.Answer.some((r) => r.type === 28)
  } catch {
    return true // fail-open
  }
}

export async function checkEmailDeliverable(email: string): Promise<EmailCheck> {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain || !domain.includes('.')) return { ok: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' }
  const suggest = TYPO_DOMAINS[domain]
  if (suggest) return { ok: false, error: `โดเมนอีเมลน่าจะพิมพ์ผิด - คุณหมายถึง @${suggest} ใช่ไหม` }
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, error: 'ไม่รองรับอีเมลชั่วคราว/อีเมลทดสอบ กรุณาใช้อีเมลที่ใช้งานจริง' }
  if (!(await domainAcceptsMail(domain))) {
    return { ok: false, error: `โดเมน @${domain} ไม่มีอยู่จริงหรือรับอีเมลไม่ได้ กรุณาตรวจสอบอีเมลอีกครั้ง` }
  }
  return { ok: true }
}
