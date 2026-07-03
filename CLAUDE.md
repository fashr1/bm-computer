# CLAUDE.md - BM Computer (บ้านมีคอม)

อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง เพื่อเข้าใจว่าโปรเจคนี้คืออะไรและกฎเหล็กที่ห้ามละเมิด

---

## โปรเจคนี้คืออะไร
**BM Computer (บ้านมีคอม)** - เว็บไซต์ร้านค้าออนไลน์จำหน่ายอุปกรณ์คอมพิวเตอร์ **ที่ใช้งานจริง** (production e-commerce)
แนวทางคล้าย JIB / Advice / iHaveCPU แต่ **ดีไซน์เป็นสไตล์ของเราเอง** (ธีมแดง-ขาว-เทา) - ไม่ลอกใครเป๊ะ ใช้แค่ "ควรมีอะไรบ้าง"

- 🌐 Live: https://bm-computer.pages.dev
- 📦 Repo: https://github.com/manatsawintho-ragoon/bm-computer (push `main` = auto-deploy)
- 🗄️ DB/Auth: Supabase project `xclugpegrcuqmnapysnf`

---

## ⛔ กฎเหล็ก (ห้ามละเมิดเด็ดขาด)

1. **ห้าม tech-debt / ห้าม stub / ห้าม mock logic เด็ดขาด**
   ทุกปุ่ม ทุก action ต้อง **ทำงานได้จริง** logic ถูกต้องครบถ้วน
   (เพิ่มลงตะกร้า=เพิ่มจริง, ชำระเงิน=สร้างออเดอร์จริงใน DB, ลบ=ลบจริง ฯลฯ)
   ถ้าทำไม่เสร็จในรอบเดียว ให้ทำทีละฟีเจอร์ให้ **สมบูรณ์** ห้ามทิ้งครึ่งๆกลางๆ

2. **Dynamic ทั้งเว็บ - ทุกอย่างคุมจากหลังบ้าน (admin)**
   - เพิ่มสินค้า/หมวด/แบรนด์/สไลด์/แบนเนอร์/เนื้อหา ในหลังบ้าน → ขึ้นเว็บทันที
   - ไม่เพิ่ม = ไม่ขึ้น · ห้าม hardcode รายการสินค้า/หมวด/แบรนด์/เนื้อหาในโค้ด
   - ทุกข้อมูลที่ลูกค้าเห็น ต้องมาจาก Supabase (ยกเว้นข้อความ UI ที่อยู่ใน i18n)

3. **ลำดับความสำคัญ (priority สูง→ต่ำ)**
   1. **Security** - RLS เปิดทุกตาราง, เขียนข้อมูลได้เฉพาะ role ที่ควร, ไม่เก็บความลับใน client (anon key เปิดเผยได้, ห้าม commit service_role/PAT), validate ฝั่ง DB ด้วย policy
   2. **Performance / DB เร็ว / เว็บเร็ว** - query เลือกเฉพาะคอลัมน์ที่ใช้, มี index, pagination เมื่อข้อมูลเยอะ, lazy-load รูป, code-split, ไม่ดึงข้อมูลซ้ำ
   3. **UX - คิดถึงลูกค้าเสมอ ใช้งานง่าย** - flow สั้น, feedback ชัด (loading/empty/error/success), responsive, เข้าถึงได้ (a11y)

4. **คิดให้รอบคอบและรอบด้านก่อนลงมือเสมอ** - วางแผนก่อนเขียนโค้ด

5. **อัปเดตเอกสารตลอด** - แก้อะไรที่กระทบสถาปัตยกรรม/ฟีเจอร์ ต้องอัปเดต `README.md` และไฟล์นี้

6. **ห้ามใช้ em-dash (อักขระ U+2014) เด็ดขาด** ทุกที่ (โค้ด, UI, README, เอกสาร, คอมเมนต์) ใช้ hyphen `-` หรือ `·` แทน

7. **Login-gating:** ฟีเจอร์ที่ผูกกับตัวตนลูกค้า (เพิ่มลงตะกร้า, สั่งซื้อ, รีวิว, บันทึกที่อยู่) ต้องเช็คว่าล็อกอินก่อน ถ้ายังไม่ล็อกอินให้เปิด Auth modal และดึงข้อมูลจาก profile มาเติมให้อัตโนมัติ (ไม่ให้ลูกค้ากรอกซ้ำ)

8. **ความปลอดภัย localStorage:** เก็บได้เฉพาะข้อมูลไม่อ่อนไหวที่ลูกค้าแก้/ลบได้โดยไม่กระทบระบบ (ตะกร้า, ธีม, ภาษา) ห้ามเก็บความลับ/ข้อมูลยืนยันตัวตนเอง ควรใช้กลไกฝั่งเซิร์ฟเวอร์ (HttpOnly Secure Cookies) + ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ (RLS) เสมอ

9. **ทางเข้า Admin ต้องไม่โผล่ที่สาธารณะ** (ห้ามลิงก์ใน footer/หน้าบ้าน) เข้าได้เฉพาะผ่านเมนูบัญชีเมื่อ role=admin หรือรู้ URL `/admin` เอง และหน้า/admin ต้องกั้นสิทธิ์

10. **แบรนด์/สินค้าต้องจริง:** โลโก้แบรนด์ใช้โลโก้จริง (เช่น Clearbit Logo API) และแสดงเฉพาะแบรนด์ที่มีสินค้าจริงในร้าน

11. **การแสดงสินค้า:** อย่างน้อย 6 ชิ้นต่อแถว ถ้าเกินให้เป็น carousel เลื่อน/ลากซ้ายขวาได้

12. **ค้นหาแบบ fuzzy:** รองรับพิมพ์ผิด/คำใกล้เคียง/คำพ้องเสียง ให้หาเจอง่ายและแม่นยำ

13. **Payment:** ยืนยันสลิปด้วย EasySlip API ผ่าน server (Cloudflare Pages Function) เท่านั้น token เก็บใน env ฝั่ง server ห้ามอยู่ใน client

14. **กันบอท:** login/register ใช้ Cloudflare Turnstile + ตรวจฝั่ง Supabase Auth (captchaToken)

15. **Placeholder ต้องได้มาตรฐานสากล:** ห้ามใส่ข้อมูลตัวอย่างปลอมเป็น placeholder (เช่น "สมชายใจดี") ใช้คำใบ้รูปแบบที่ถูกต้องแทน

---

## สถาปัตยกรรม
| ชั้น | เทคโนโลยี |
|------|-----------|
| Frontend | React 18 + Vite + React Router (BrowserRouter) |
| Styling | Tailwind CSS v4 (design tokens) · Dark/Light · ฟอนต์ Inter + Sarabun |
| **API (backend)** | **Cloudflare Worker (Hono + OpenAPI/Swagger)** - modular monolith, โฟลเดอร์ `backend/` · Swagger UI ที่ `/api/docs` |
| Database/Auth | **Supabase** (PostgreSQL + Auth + RLS) - เข้าถึงผ่าน backend (RLS ยังเปิดเป็น defense-in-depth) |
| Hosting | **Cloudflare Pages** (frontend) + **Cloudflare Worker** (backend) - auto-deploy จาก GitHub `main` |
| ชำระเงิน | PromptPay QR + EasySlip verify (ผ่าน backend) |

### Data flow (สถาปัตยกรรมใหม่ - API-based)
`components → src/lib/apiClient.js (credentials:'include') → backend Worker → Supabase`
- **Auth/Account/Orders/Admin/Payments:** ผ่าน backend API (`backend/src/modules/*`) เท่านั้น
- **Session:** HttpOnly cookie (access 15 นาที / refresh 7 วัน rotation) - หมดอายุจริง ไม่ค้างตลอด
- **สลับโหมด:** ตั้ง `VITE_API_BASE` = เปิด API · ไม่ตั้ง = fallback ต่อ Supabase ตรงแบบเดิม (ไม่พัง prod ระหว่างย้าย)
- **RLS บังคับจริง:** backend สร้าง Supabase client "สวมสิทธิ์ user" (แนบ access token) ทุก query ต่อ DB จึงถูก RLS บังคับในนามผู้ใช้ (ไม่พึ่ง service_role)
- **ตรวจ token:** ผ่าน Supabase `auth.getUser` (เช็ค signature+exp) - ไม่ต้องใช้ JWT secret
- Backend ต้องการแค่ `SUPABASE_URL` + `SUPABASE_ANON_KEY` · service_role ใช้เฉพาะ verify-slip (ตัวเลือก)

---

## โครงสร้างโค้ด
```
src/
├── lib/         supabase.js (client), api.js (query layer), useFetch.js, ui.js (helpers)
├── theme/       ThemeContext (dark/light)
├── i18n/        LanguageContext + translations.js (ไทย/อังกฤษ) - ข้อความ UI ทั้งหมดอยู่ที่นี่
├── components/  Navbar, Footer, BrandLogo, Icons (SVG เท่านั้น), ProductCard,
│                HeroCarousel, BrandBar, FlashSale, Lightbox, AuthModal, AuthForm
├── pages/       Home, ProductList, ProductDetail, Cart, Checkout, OrderTracking,
│                OrderHistory, PCBuilder, AdminDashboard, NotFound
└── data/mock.js  (กำลังเลิกใช้ - ย้ายไป DB ให้หมด)

supabase/        schema.sql, seed.sql, config.toml, migrations/ (<version>_<name>.sql), README.md

backend/         *** Backend API แยก (Cloudflare Worker) ***
├── src/index.ts        entry: mount modules + CORS + Swagger UI (/api/docs)
├── src/lib/            env, supabase(admin/anon), cookies, session(jwt), middleware, turnstile, http, openapi
├── src/modules/        auth, account, catalog, orders, admin, payments
├── wrangler.toml       ค่าตั้ง Worker + [vars] (TTL/cookie/CORS)
└── .dev.vars.example   ค่าลับ (คัดลอกเป็น .dev.vars) · README.md วิธีรัน/deploy
```
> อ่าน `backend/README.md` ก่อนแก้ backend (โมเดล session + วิธี deploy อยู่ในนั้น)

## ฐานข้อมูล (ตารางหลัก)
`categories, brands, products, slides, profiles, orders, order_items, reviews, site_settings`
- ดูรายละเอียด + RLS ใน `supabase/schema.sql`
- ตาราง slides ยังไม่มี unique key (กัน seed ซ้ำ) - มี TODO ใส่ constraint

## คอนเวนชัน
- **ไอคอน: SVG เท่านั้น** (ใน `components/Icons.jsx`) - **ห้ามใช้ emoji เป็นไอคอน** (หลัก ui-ux-pro-max)
- **ข้อความทุกอย่าง 2 ภาษา** ผ่าน `t('section.key')` - ห้าม hardcode ข้อความไทย/อังกฤษในคอมโพเนนต์
- **สี/พื้นผิว** ใช้ token (`bg-surface text-fg border-line bg-brand-600 ...`) ปรับ dark/light อัตโนมัติ
- ราคา/ตัวเลข ใส่ class `nums` (tabular)

## คำสั่ง
```bash
npm run dev      # รัน backend worker (:8787) + vite (:5173) พร้อมกันด้วย concurrently (แก้ปัญหา "ต่อ DB ไม่ได้" เพราะลืมรัน backend)
npm run dev:web  # vite อย่างเดียว
npm run dev:api  # backend worker อย่างเดียว
npm run build    # production build -> dist/
npm run preview  # preview build
```
`.env.local` (dev) / `.env.production` (commit ได้ เพราะ anon key เปิดเผยได้) มี `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## สถานะปัจจุบัน (อัปเดตเมื่อแก้)
- ✅ ออนไลน์ + ต่อ Supabase จริง (สินค้า/หมวด/แบรนด์/สไลด์จาก DB)
- ✅ หน้าแรก dynamic: Hero carousel, Flash Sale (countdown), Brand bar (โลโก้จริง Simple Icons + เฉพาะแบรนด์ที่มีสินค้า), ProductRow (carousel ลากได้ 6/แถว)
- ✅ ตะกร้าจริง + checkout สร้างออเดอร์จริง + ติดตาม/ประวัติจาก DB (login-gated)
- ✅ ค้นหา fuzzy (พิมพ์ผิดก็เจอ) + กรอง cat/brand จริง
- ✅ Auth ทั้งแอป (session/role) + เมนูบัญชี/logout · Dark/Light · 2 ภาษา · แกลเลอรีซูม
- ✅ ลบ em-dash หมด · login-gate ตะกร้า/สั่งซื้อ · ลบ admin ออกจาก footer · placeholder มาตรฐาน
- ✅ **Admin CMS** (role-guarded): ภาพรวม + สินค้า CRUD (รูปแบบลิงก์+สเปค) + สไลด์/แบนเนอร์ CRUD (คุม carousel) + ออเดอร์ (อัปเดตสถานะ) - เขียน DB จริงผ่าน admin RLS. เข้าผ่านเมนูบัญชี (isAdmin) ที่ /admin
- ✅ **Turnstile** ต่อ login/register แล้ว (ส่ง captchaToken ให้ Supabase) - ต้องเปิด Captcha + ใส่ secret ใน Supabase Auth เพื่อบังคับใช้จริง
- ✅ EasySlip verify (Pages Function) + Checkout 2 เฟส (อัปโหลดสลิป) - รอ SUPABASE_SERVICE_ROLE_KEY (legacy JWT) ใน Cloudflare
- ✅ **PromptPay จริง**: `lib/promptpay.js` gen EMVCo payload + CRC (ล็อคยอด) · Admin ตั้งบัญชีรับเงิน (site_settings key='payment')
- ✅ Carousel: แก้บั๊ก hover-all (named group/row + group/card) · auto-scroll วน 5 วิ · drag ลื่น · Footer redesign
- ✅ **Backend API แยก (Cloudflare Worker · Hono + OpenAPI/Swagger)** ที่ `backend/` - modular monolith (auth/account/catalog/orders/admin/payments) · Swagger UI `/api/docs` · 32 endpoints
- ✅ **Session หมดอายุจริง**: ห่อ Supabase Auth + HttpOnly cookie (access 15 นาที / refresh 7 วัน rotation) · apiClient auto-refresh เมื่อ 401 · ไม่ค้าง session อีกต่อไป
- ✅ **บัญชีของฉัน (My Account)** ตามดีไซน์ iHaveCPU: ข้อมูลส่วนตัว (วันเกิด/LINE/FB) · ที่อยู่จัดส่ง CRUD · ที่อยู่ใบกำกับภาษี CRUD · ช่องทางชำระเงิน CRUD · สินค้าที่ถูกใจ (wishlist + ปุ่มหัวใจบนการ์ด) · การ์ดสรุปออเดอร์ 4 ใบ (`/account`)
- ✅ migration `supabase/migrations/0001_account.sql`: ขยาย profiles + ตาราง addresses/tax_profiles/payment_methods/wishlist + RLS own-row (apply แล้ว)
- ✅ **frontend ย้ายมาเรียก backend ครบ** เมื่อเปิด API (`src/lib/api.js` สลับ apiEnabled): catalog/products/slides/brands/categories + orders (create/my/track) + admin (products/slides/orders/stats/settings) + checkout verify-slip · ยังมี fallback Supabase ตรงเมื่อปิด API
- ✅ **ทดสอบ E2E กับ Supabase จริงแล้ว**: register/login/refresh/logout, /me, profile, สร้าง+ลิสต์ address (RLS-scoped), summary, validation (tax_id 13 หลัก), 401 เมื่อไม่มี cookie, catalog ผ่าน vite proxy - ผ่านทั้งหมด (สร้าง user ทดสอบแล้วลบทิ้ง)
- ✅ backend รันด้วยแค่ `SUPABASE_URL`+`SUPABASE_ANON_KEY` (public - อยู่ใน wrangler.toml [vars]) - ไม่ต้อง service_role/JWT secret
- ✅ **Deploy แล้ว**: worker live ที่ `https://bm-computer-api.manatsawin-tho.workers.dev` (Swagger `/api/docs`) · `.env.production` ตั้ง `VITE_API_BASE` ชี้ worker -> Cloudflare Pages build จะเปิด API ให้เอง
- ✅ **Google OAuth ผ่าน backend**: client ทำ OAuth (supabase-js) -> `POST /api/auth/session` โอน token เข้าเป็น HttpOnly cookie -> signOut client (session อยู่ที่ cookie ที่เดียว) · ต้องเปิด Google provider + redirect URL ใน Supabase Auth ให้ทำงานจริง
- ✅ **verify-slip**: อยู่ที่ Cloudflare Pages Function `/api/verify-slip` (มี service_role - server-trust กันปลอมสถานะจ่าย) · worker มี `/api/payments/verify-slip` เตรียมไว้ (ใช้เมื่อใส่ service_role ให้ worker)
- ✅ **Skeleton loading ทั้งเว็บ**: `components/Skeleton.jsx` (ProductCard/Row/Grid, ProductDetail, Order list, Table, Slide, Form, BrandBar) + utility `.skeleton` (shimmer) ใน index.css - ใช้แทน "กำลังโหลด..."/spinner ทุกหน้า (หน้าบ้าน+บัญชี+แอดมิน)
- ✅ **i18n ครบทุกหน้า**: แอดมินทั้งหมด + AuthForm (placeholder/error) + Checkout errors + topbar + FlashSale/BrandBar/Footer ผ่าน t() หมดแล้ว · ข้อความ error ใน lib (apiClient/api) ใช้ `tOutside()` จาก translations.js (อ่านภาษาจาก localStorage)
- ✅ **Google OAuth UX**: overlay "กำลังเข้าสู่ระบบด้วย Google" ตอนกลับจาก OAuth (flag `bm-oauth-return` ใน sessionStorage - เช็คจาก hash ตรงๆ ไม่ได้เพราะ supabase-js ลบก่อน React mount) แสดงขั้นต่ำ 900ms กันกระพริบ · spinner ทุกตัวใช้ class `.spinner` (1.4s หมุนนุ่มกว่า animate-spin)
- ✅ **ระบบรีวิวจริง**: ตาราง reviews + unique(user,product) + RLS แก้/ลบของตัวเอง + trigger คำนวณ products.rating/reviews_count อัตโนมัติ (migration `20260703042228_reviews_system`) · worker endpoints GET/POST/DELETE `/api/catalog/products/{slug}/reviews` (POST เช็ค verified purchase จากออเดอร์จริง, เก็บ author_name บนแถว - ไม่เปิด profiles สาธารณะ) · UI แท็บรีวิวใน ProductDetail (`components/Reviews.jsx`): ลิสต์+ให้ดาว+เขียน/แก้/ลบของตัวเอง, badge "ซื้อแล้ว"/"รีวิวของฉัน" - ทดสอบ E2E ครบวงจรแล้ว (สร้าง user ทดสอบ -> รีวิว -> trigger อัปเดตคะแนน -> ลบ -> คืนค่า seed)
- ✅ **หมวดหมู่ทั้งเว็บมาจาก DB**: `catalog/CatalogContext.jsx` โหลด categories ครั้งเดียว (name_th/name_en/icon) -> Navbar/Home/ProductList/ProductCard/Cart/ProductDetail ใช้ catName() - เพิ่มหมวดในหลังบ้านขึ้นเว็บทันที (เลิกใช้ categories ใน mock.js แล้ว)
- ✅ **Admin CRUD หมวดหมู่+แบรนด์** (`pages/admin/AdminCatalog.jsx` แท็บ "หมวดหมู่/แบรนด์"): ตาราง+ฟอร์ม+เลือกไอคอน (iconNames จาก Icons.jsx) · worker endpoints POST/DELETE `/api/admin/{brands,categories}` (requireAdmin) · เตือนตอนลบว่าสินค้าในหมวด/แบรนด์จะหายจากหน้าร้าน (query ใช้ inner join)
- ✅ **SEO**: `lib/usePageMeta.js` ตั้ง `<title>` + meta description ต่อหน้า ทุกหน้า (หน้าสินค้าใช้ชื่อ+หมวด+ราคา)
- ✅ **Supabase Preview (GitHub integration) ใช้ได้แล้ว**: ไฟล์ migration ต้องชื่อ `<version>_<name>.sql` ตรงกับ `supabase_migrations.schema_migrations` ฝั่ง remote เป๊ะ - แก้โดย rename 0001 เป็น `20260701185434_account_section.sql`, เพิ่ม baseline `20260630000000_init_schema.sql` (= schema.sql) + insert version ลง history remote, เพิ่ม `supabase/config.toml` (seed = seed.sql)
- 📌 **กฎ migration ใหม่**: apply ผ่าน Supabase MCP (`apply_migration`) แล้ว "ต้อง" สร้างไฟล์ local `supabase/migrations/<version>_<name>.sql` เนื้อหาเดียวกัน (ดู version จาก `list_migrations`) ไม่งั้น Supabase Preview บน GitHub จะพังอีก
- ✅ **Google provider เปิดแล้วใน Supabase** (`/auth/v1/settings` -> google: true) - Google login ใช้ได้จริงทั้ง flow (client OAuth -> POST /api/auth/session -> HttpOnly cookie)
- 🟡 **เฟสถัดไป:** ตั้ง Supabase JWT expiry ≈900s (Dashboard -> Authentication -> Sessions), (ตัวเลือก) ย้าย verify-slip มา worker เมื่อใส่ service_role, ผูก custom domain ให้ worker แก้ปัญหา third-party cookie, ระบบรีวิวเฉพาะผู้ซื้อ (ตอนนี้ล็อกอินก็รีวิวได้ แต่มี badge แยกผู้ซื้อจริง)
- ⚠️ **คุกกี้ข้ามโดเมน** (pages.dev -> workers.dev) ใช้ SameSite=None+Secure - ทำงานบน Chrome แต่บางเบราว์เซอร์ที่บล็อก third-party cookie อาจมีปัญหา · ทางแก้ระยะยาว: ผูก worker เข้าโดเมนเดียวกับ frontend (custom domain/route) แล้วใช้ SameSite=Lax
- 📌 **Supabase MCP**: ใช้รัน migration ได้เอง (apply_migration) - migration 0001 apply แล้ว

## แผนทำให้ "ใช้งานได้จริงทั้งหมด" (ทำทีละชิ้นให้สมบูรณ์ ไม่ stub)
1. **Auth state ทั้งแอป** (session/user/role) + ปุ่ม logout + การ์ดบัญชี + กั้นหน้า /admin
2. **ตะกร้าจริง** (CartContext + persist) → เพิ่ม/ลบ/แก้จำนวน + ตัวเลขบน navbar จริง
3. **Checkout จริง** → สร้าง `orders` + `order_items` ใน DB (ต้องล็อกอิน) → เคลียร์ตะกร้า → ติดตามได้
4. **ค้นหา/ฟิลเตอร์/เรียงลำดับ** ทำงานจริง (query Supabase)
5. **ติดตาม/ประวัติออเดอร์** ดึงจาก DB จริง
6. **Admin CMS (CRUD)** - จัดการสินค้า/หมวด/แบรนด์/สไลด์/เนื้อหา/ออเดอร์ จากหลังบ้าน (เพิ่มแล้วขึ้นเว็บทันที)
7. catalog ที่ยัง hardcode (categories/brands ใน mock.js) → ย้ายไป DB ให้หมด
8. SEO: dynamic `<title>`/meta ต่อหน้า

---
> เป้าหมาย: เว็บที่ **ใช้งานได้จริง 100% · คุมจากหลังบ้านได้ทั้งหมด · เร็ว · ปลอดภัย · ลูกค้าใช้ง่าย**
