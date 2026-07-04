// ตรวจอีเมลฝั่ง client แบบทันที (UX) - ฝั่ง server (backend/src/lib/email.ts) เป็นตัวตัดสินจริง
// เป้าหมาย: ลดอีเมลตีกลับ (bounce) ตามคำเตือนจาก Supabase - จับโดเมนพิมพ์ผิด + อีเมลชั่วคราว

const TYPO_DOMAINS = {
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

const DISPOSABLE_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'test.com', 'test.co', 'testing.com',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'tempail.com', 'throwawaymail.com', 'yopmail.com',
  'trashmail.com', 'fakeinbox.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'mintemail.com', 'mohmal.com', 'emailondeck.com', 'spamgourmet.com', 'mytemp.email',
  'localhost', 'localhost.com', 'invalid.com', 'asdf.com', 'aaa.com', 'abc.com',
])

const domainOf = (email) => (email.split('@')[1] || '').toLowerCase().trim()

// คืนอีเมลที่แก้โดเมนพิมพ์ผิดให้แล้ว หรือ null ถ้าไม่พบปัญหา
export function suggestEmailFix(email) {
  const d = domainOf(email)
  const fix = TYPO_DOMAINS[d]
  return fix ? `${email.split('@')[0]}@${fix}` : null
}

export const isDisposableEmail = (email) => DISPOSABLE_DOMAINS.has(domainOf(email))
