<p align="center">
  <img src="./public/logo-full.png" alt="BM Computer บ้านมีคอม" width="420" />
</p>

# 🖥️ BM Computer (บ้านมีคอม)

ร้านค้าออนไลน์จำหน่ายอุปกรณ์คอมพิวเตอร์ครบวงจร (แนว JIB · Advice · iHaveCPU)
สร้างด้วย **React + Vite + Tailwind CSS** · ฐานข้อมูล/ล็อกอินจริงด้วย **Supabase** · deploy ฟรีบน **Cloudflare Pages**

🌐 **เว็บไซต์ (Live):** _<ใส่ URL หลังต่อ Cloudflare Pages — เช่น https://bm-computer.pages.dev>_
📦 **โค้ด:** https://github.com/manatsawintho-ragoon/bm-computer

> เดิมเริ่มจาก Wireframe (CSI204 Workshop #1) ปัจจุบันพัฒนาเป็น **เว็บใช้งานจริง** เต็มระบบ

---

## 🧭 สถานะการพัฒนา (Roadmap)

| เฟส | งาน | สถานะ |
|----|-----|------|
| **0** | โครงเว็บ + ขึ้น GitHub + Deploy Cloudflare Pages (ออนไลน์มีลิงก์) | 🟡 กำลังต่อ Cloudflare |
| 1 | **Supabase**: schema + seed สินค้าหลายชิ้น + Auth จริง + RLS security | ⏳ |
| 2 | **Storefront แนว iHaveCPU**: carousel/Flash Sale/แบรนด์ + แกลเลอรีซูม(lightbox) + PromptPay QR | ⏳ |
| 3 | **Admin CMS**: CRUD + จัดการสไลด์/ภาพ(ลิงก์)/เนื้อหา + CRM + dynamic title & SEO | ⏳ |

✅ เสร็จแล้ว: Dark/Light mode · 2 ภาษา (ไทย/อังกฤษ) · โลโก้+favicon แบรนด์จริง · Auth popup modal · BrowserRouter+SEO-ready · ขึ้น GitHub

---

## 🛠️ เทคโนโลยี
| ส่วน | ใช้ |
|------|-----|
| Frontend | React 18 + Vite + React Router |
| Styling | Tailwind CSS v4 · Dark/Light · ฟอนต์ Inter + Sarabun |
| i18n | ไทย/อังกฤษ (Context) |
| Backend/DB/Auth | **Supabase** (PostgreSQL + Auth + Storage + RLS) |
| Hosting | **Cloudflare Pages** (ฟรี · auto-deploy จาก GitHub) |
| ชำระเงิน | PromptPay QR |

---

## 🚀 รันในเครื่อง (Dev)
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # -> dist/
npm run preview
```

---

## ☁️ Deploy ขึ้น Cloudflare Pages (ครั้งเดียว → auto-deploy ตลอด)
1. เข้า https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. เลือก repo **`bm-computer`** (กด Install & Authorize Cloudflare ให้เข้าถึง GitHub)
3. ตั้งค่า Build:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. กด **Save and Deploy** → ได้ลิงก์ `https://bm-computer.pages.dev`

> หลังจากนี้ทุกครั้งที่ `git push` Cloudflare จะ build + อัปเดตเว็บอัตโนมัติ (พัฒนาจากที่ไหนก็ได้)
> ไฟล์ `public/_redirects` รองรับ SPA routing ไว้แล้ว

---

## 📁 โครงสร้าง
```
bm-computer/
├── public/            # โลโก้ favicon + _redirects (SPA)
├── src/
│   ├── components/     # Navbar, Footer, BrandLogo, AuthModal, ProductCard, Icons
│   ├── pages/          # Home, ProductList, ProductDetail, Cart, Checkout, ...
│   ├── theme/          # Dark/Light
│   ├── i18n/           # ไทย/อังกฤษ
│   ├── lib/            # helpers
│   └── data/mock.js    # ข้อมูลตัวอย่าง (จะย้ายไป Supabase ในเฟส 1)
└── docs/               # Analysis & Design, Architecture (Mermaid), Deployment
```

---
<p align="center"><sub>© 2026 BM Computer (บ้านมีคอม) · พัฒนาต่อยอดจากรายวิชา CSI204</sub></p>
