// Cloudflare Pages Function: proxy /api/* (ทุก method) -> backend Worker
// ทำให้ frontend เรียก API แบบ same-origin (https://bm-computer.pages.dev/api/...)
// -> คุกกี้ session เป็น first-party แก้ปัญหาเบราว์เซอร์ที่บล็อก third-party cookie
//    (pages.dev -> workers.dev) ซึ่งทำให้ล็อกอินไม่ติด/โดน 401
// หมายเหตุ: /api/verify-slip มีไฟล์เฉพาะ (verify-slip.js) Cloudflare จะเลือกไฟล์ที่เจาะจงกว่าให้เอง

const API_HOST = 'bm-computer-api.manatsawin-tho.workers.dev'

export async function onRequest({ request }) {
  const url = new URL(request.url)
  url.protocol = 'https:'
  url.hostname = API_HOST
  url.port = ''
  // ส่ง request เดิมทั้ง method/headers/body และคืน response ตรงๆ (รวม Set-Cookie)
  return fetch(new Request(url, request))
}
