<p align="center">
  <img src="./public/logo-full.png" alt="BM Computer บ้านมีคอม" width="420" />
</p>

<h1 align="center">BM Computer (บ้านมีคอม)</h1>
<p align="center">ระบบร้านค้าออนไลน์จำหน่ายอุปกรณ์คอมพิวเตอร์ · รายวิชา CSI204</p>
<p align="center">
  🌐 <b>เว็บไซต์:</b> <a href="https://bm-computer.pages.dev">bm-computer.pages.dev</a> ·
  📦 <b>ซอร์สโค้ด:</b> <a href="https://github.com/manatsawintho-ragoon/bm-computer">GitHub</a>
</p>

---

## 1. ข้อมูลโครงงาน
**ชื่อโครงงาน:** BM Computer (บ้านมีคอม) - ระบบร้านค้าออนไลน์จำหน่ายอุปกรณ์คอมพิวเตอร์
**รายวิชา:** CSI204 - ดิจิทัลแพลตฟอร์มสำหรับพัฒนาซอฟต์แวร์

**ผู้จัดทำ**

| ลำดับ | รหัสนักศึกษา | ชื่อ-นามสกุล | ตำแหน่ง |
|:----:|:------------:|--------------|---------|
| 1 | 67091885 | มนัสวิน ทองดี | Project Manager |
| 2 | 67133473 | ประสบการณ์ ผมพันธ์ | Developer (Fullstack) |
| 3 | 67131315 | ณภัทร พิชัยรัตน์ | Developer (Fullstack) |
| 4 | 67129568 | สิทธา ว่องคุณากร | Developer (Fullstack) |
| 5 | 67111886 | คชาณบ สวัสดี | Developer (Fullstack) |

---

## 2. วัตถุประสงค์ของโครงงาน
1. พัฒนา **เว็บไซต์ร้านค้าออนไลน์ที่ใช้งานได้จริง** สำหรับจำหน่ายอุปกรณ์คอมพิวเตอร์ครบวงจร
2. ออกแบบประสบการณ์ผู้ใช้ (UX/UI) ที่ทันสมัย ใช้งานง่าย รองรับทุกอุปกรณ์ (Responsive) ทั้งโหมดสว่าง/มืด และ 2 ภาษา (ไทย/อังกฤษ)
3. สร้างระบบที่ **ควบคุมเนื้อหาทั้งหมดได้จากหลังบ้าน (Dynamic + Admin CMS)** - เพิ่ม/แก้/ลบสินค้า สไลด์ และเนื้อหา แล้วแสดงผลบนเว็บทันที
4. นำหลักการ **กระบวนการพัฒนาซอฟต์แวร์ (SDLC)** และเครื่องมือจริง (Git/GitHub, CI/CD) มาประยุกต์ใช้
5. ฝึกพัฒนาระบบที่ให้ความสำคัญกับ **ความปลอดภัย ประสิทธิภาพ และความเร็ว** ในระดับใช้งานจริง

---

## 3. เทคโนโลยีที่ใช้ (Tech Stack)
| ส่วน | เทคโนโลยี |
|------|-----------|
| **Frontend** | React 18, Vite, React Router |
| **Styling/UI** | Tailwind CSS v4 (Design Tokens), Dark/Light Mode, ฟอนต์ Inter + Sarabun |
| **i18n** | ระบบ 2 ภาษา (ไทย/อังกฤษ) ด้วย React Context |
| **Backend / API** | **Cloudflare Worker** - Hono + OpenAPI/Swagger (modular monolith, `backend/`) · เอกสาร API อัตโนมัติที่ `/api/docs` |
| **Database** | **Supabase** - PostgreSQL, Row Level Security (RLS) |
| **Authentication** | Supabase Auth ห่อด้วย backend + **Session สั้น (HttpOnly cookie · access 15 นาที / refresh 7 วัน rotation)** |
| **Storage** | Supabase Storage (รูปภาพ) |
| **Hosting / Deploy** | **Cloudflare Pages** (frontend) + **Cloudflare Worker** (backend API) - CI/CD จาก GitHub |
| **Version Control** | Git + GitHub |
| **Payment** | PromptPay QR |
| **เอกสาร/ออกแบบ** | Markdown + Mermaid Diagram |

---

## 4. สถาปัตยกรรมระบบ (SDLC)
ใช้กระบวนการพัฒนาแบบ **Iterative / Agile** - พัฒนาเป็นรอบ ส่งมอบเป็นเฟส และปรับปรุงต่อเนื่อง

| เฟส | กิจกรรมในโครงงานนี้ |
|-----|---------------------|
| **1. Planning** | กำหนดขอบเขต ฟีเจอร์ กลุ่มผู้ใช้ และเทคโนโลยี |
| **2. Design** | ออกแบบ UX/UI (ธีมแดง-ขาว-เทา), โครงสร้างหน้า (Wireframe), โมเดลข้อมูล (ERD), สถาปัตยกรรมระบบ |
| **3. Development** | พัฒนา Frontend (React) + ต่อฐานข้อมูล Supabase + ระบบ Auth/ตะกร้า/สั่งซื้อ/หลังบ้าน |
| **4. Testing** | ทดสอบการทำงานจริงผ่านเบราว์เซอร์ (ตะกร้า/ชำระเงิน/ออเดอร์), ตรวจ Console/Build |
| **5. Deployment & Maintenance** | Deploy บน Cloudflare Pages (auto-deploy ทุก `git push`) + ปรับปรุงต่อเนื่อง |

> ทุกการเปลี่ยนแปลงที่ push ขึ้น GitHub branch `main` จะถูก Build และ Deploy ขึ้นเว็บโดยอัตโนมัติ (CI/CD)

---

## 5. ขอบเขตของระบบ
**ฟังก์ชันในระบบ (In Scope)**
- 🛍️ หน้าร้าน (Storefront): Hero Carousel, Flash Sale (นับถอยหลัง), แถบแบรนด์, สินค้าแนะนำ/มาใหม่ - **ดึงข้อมูลจากฐานข้อมูลจริง**
- 🔎 รายการสินค้า + **ค้นหาอัจฉริยะ (autocomplete dropdown, fuzzy รองรับพิมพ์ผิด)** + กรองตามหมวด/แบรนด์ + รายละเอียดสินค้า + แกลเลอรีซูม (Lightbox)
- 🧭 เมนูหมวดหมู่แบบ dropdown รวมทุกหมวด · สินค้ากว่า **150 รายการ** จาก **39 แบรนด์ (โลโก้จริง)**
- 🛒 ตะกร้าสินค้า (เพิ่ม/ลบ/แก้จำนวน) + ชำระเงินด้วย **PromptPay QR + ยืนยันสลิป (EasySlip)** + สร้างคำสั่งซื้อจริง (ตัดสต็อกตอนจ่าย)
- 📦 **จัดส่ง + ยกเลิก + คืนเงิน:** ติดตามสถานะ (เลขพัสดุ/ขนส่ง) · ลูกค้ายกเลิกออเดอร์เอง (ยังไม่จ่าย=ยกเลิกทันที · จ่ายแล้ว=ขอยกเลิกรอแอดมินคืนเงิน)
- 👤 ระบบสมาชิก (**หน้า Login/Register เต็มหน้า** + Google OAuth) + **session หมดอายุจริง (HttpOnly cookie)** + ตรวจอีเมลกันตีกลับ
- 🧾 **บัญชีของฉัน (My Account):** ข้อมูลส่วนตัว · ที่อยู่จัดส่ง · ที่อยู่ใบกำกับภาษี · ช่องทางชำระเงิน · สินค้าที่ถูกใจ (Wishlist) · สรุปออเดอร์
- ⚙️ จัดสเปคคอม (PC Builder) + 🌐 **สเปคชุมชน (Community Builds)** - ดู/นำสเปคที่ผู้ใช้อื่นแชร์ไปใช้ต่อ
- 🛠️ **ระบบหลังบ้าน (Admin Panel เต็มหน้า + sidebar):** ภาพรวม · สินค้า · หมวด/แบรนด์ · สไลด์ · ออเดอร์ · การชำระเงิน (คืนเงิน) · ลูกค้า · ตั้งค่า
- 🌗 Dark/Light Mode · 🌐 ไทย/อังกฤษ · 📱 Responsive

**นอกขอบเขต (Out of Scope) - เฟสปัจจุบัน**
- การเชื่อมต่อ Payment Gateway จริง (ปัจจุบันใช้ QR ตัวอย่าง) · แอปมือถือ Native · ระบบขนส่งจริง

---

## 6. คุณค่าของโครงการ (Value Proposition)
- **ครบ จบ ในที่เดียว** - เลือกซื้ออุปกรณ์คอมพิวเตอร์ พร้อมฟีเจอร์ช่วยจัดสเปค
- **คุมได้จากหลังบ้านทั้งหมด (Dynamic)** - ร้านอัปเดตสินค้า/โปรโมชัน/หน้าเว็บได้เองโดยไม่ต้องแก้โค้ด
- **ปลอดภัย** - ควบคุมสิทธิ์การเข้าถึงข้อมูลด้วย Row Level Security ระดับฐานข้อมูล
- **เร็วและประหยัด** - โฮสต์บน Edge Network ของ Cloudflare (ฟรี) + Query ที่ออกแบบให้เร็ว
- **ประสบการณ์ลูกค้าดี** - UI ทันสมัย ใช้งานง่าย รองรับมือถือ ไทย/อังกฤษ และโหมดมืด
- **พร้อมต่อยอด** - โครงสร้างพร้อมขยายสู่ระบบจริงเต็มรูปแบบ (Payment, CRM, การจัดส่ง)

---

## 7. System Architecture

```mermaid
graph TD
    subgraph Client["ผู้ใช้งาน"]
        U[ลูกค้า / แอดมิน<br/>เบราว์เซอร์ Desktop/Mobile]
    end

    subgraph Edge["Cloudflare Pages (Edge/CDN)"]
        FE[React + Vite + Tailwind SPA<br/>Dark/Light · ไทย/อังกฤษ]
    end

    subgraph Worker["Cloudflare Worker - Backend API"]
        API[Hono + OpenAPI/Swagger<br/>auth · account · catalog<br/>orders · admin · payments]
        DOCS[/Swagger UI · /api/docs/]
    end

    subgraph Supabase["Supabase"]
        AUTHP[Auth Provider<br/>Email/Password]
        DB[(PostgreSQL<br/>+ Row Level Security)]
        ST[Storage]
    end

    PAY[PromptPay QR + EasySlip]

    U -->|HTTPS| FE
    FE -->|fetch credentials:include<br/>ส่ง HttpOnly cookie| API
    API -. ออก access 15 นาที / refresh 7 วัน<br/>เป็น HttpOnly cookie .-> FE
    API -->|ห่อ login/refresh| AUTHP
    API -->|service_role + ตรวจสิทธิ์| DB
    API -->|verify JWT ทุก request| AUTHP
    API --> ST
    API --> PAY
    API --- DOCS
```

**หลักการสำคัญ**
- Frontend เป็น Static SPA เสิร์ฟผ่าน Cloudflare Edge → โหลดเร็วทั่วโลก
- ข้อมูลทั้งหมดมาจาก Supabase แบบ Dynamic - แก้ที่ฐานข้อมูล/หลังบ้าน เว็บเปลี่ยนทันที
- ความปลอดภัยบังคับที่ชั้นฐานข้อมูล (RLS): ลูกค้าเห็นเฉพาะข้อมูลตนเอง, แก้ catalog ได้เฉพาะ Admin

---

## 8. Use Case Diagram

```mermaid
flowchart LR
    Guest[ผู้เยี่ยมชม / Guest]
    Customer[ลูกค้า / Customer]
    Admin[ผู้ดูแลระบบ / Admin]

    subgraph System[ระบบ BM Computer]
        UC1[ดูสินค้าทั้งหมด]
        UC2[ค้นหาและกรองสินค้า]
        UC3[ดูรายละเอียดสินค้า]
        UC4[เข้าสู่ระบบ / สมัครสมาชิก]
        UC5[จัดการตะกร้าสินค้า]
        UC6[ชำระเงินและสร้างคำสั่งซื้อ]
        UC7[ติดตามและดูประวัติคำสั่งซื้อ]
        UC8[ใช้ PC Builder]
        UC9[จัดการสินค้าและหมวดหมู่]
        UC10[จัดการออเดอร์และสไลด์]
    end

    Guest --> UC1
    Guest --> UC2
    Guest --> UC3

    Customer --> UC4
    Customer --> UC5
    Customer --> UC6
    Customer --> UC7
    Customer --> UC8

    Admin --> UC9
    Admin --> UC10

    UC4 --> System
    UC5 --> System
    UC6 --> System
    UC7 --> System
    UC8 --> System
    UC9 --> System
    UC10 --> System
```

**ความหมายของแผนภาพ**
- ผู้เยี่ยมชมสามารถดูสินค้าและค้นหาได้ก่อนล็อกอิน
- ลูกค้าต้องเข้าสู่ระบบก่อนใช้ฟีเจอร์ตะกร้า ออเดอร์ และการติดตามสถานะ
- แอดมินมีสิทธิ์จัดการข้อมูลสินค้า ออเดอร์ สไลด์ และการตั้งค่าเว็บไซต์ผ่านแดชบอร์ด

---

## 9. Class Diagram

```mermaid
classDiagram
    class User {
        +id
        +email
        +role
        +signIn()
        +signOut()
    }

    class Profile {
        +fullName
        +phone
        +address
        +role
    }

    class Product {
        +id
        +slug
        +name
        +price
        +salePrice
        +stock
        +images
        +specs
        +getDisplayPrice()
    }

    class Category {
        +id
        +slug
        +name
    }

    class Brand {
        +id
        +slug
        +name
    }

    class CartItem {
        +slug
        +name
        +qty
        +price
    }

    class Order {
        +id
        +code
        +status
        +total
        +paymentMethod
        +create()
        +updateStatus()
    }

    class OrderItem {
        +productId
        +qty
        +price
    }

    class AuthContext {
        +user
        +profile
        +isAdmin
        +signOut()
    }

    class CartContext {
        +items
        +add()
        +setQty()
        +remove()
        +clear()
    }

    class ApiService {
        +fetchProducts()
        +fetchProductBySlug()
        +createOrder()
        +adminListProducts()
        +saveSlide()
    }

    User "1" --> "0..*" Order : places
    User "1" --> "1" Profile : has
    Category "1" --> "0..*" Product : groups
    Brand "1" --> "0..*" Product : brands
    Product "1" --> "0..*" CartItem : added to
    Order "1" --> "1..*" OrderItem : contains
    AuthContext --> User
    CartContext --> CartItem
    ApiService --> Product
    ApiService --> Order
```

**ภาพรวมของแบบจำลองคำสั่งและข้อมูล**
- `AuthContext` และ `CartContext` เป็นตัวจัดการสถานะหลักของหน้าเว็บ
- `ApiService` (frontend `src/lib/apiClient.js` + `accountApi.js`) เรียก **backend API (Cloudflare Worker)** ผ่าน HTTPS พร้อมส่ง HttpOnly cookie และ auto-refresh session เมื่อหมดอายุ · backend เป็นตัวคุยกับ Supabase
- `Product`, `Order`, และ `OrderItem` เป็นโครงสร้างข้อมูลหลักสำหรับร้านค้าออนไลน์

---
<p align="center"><sub>© 2026 BM Computer (บ้านมีคอม) · CSI204</sub></p>
