import { Icon } from './Icons'
import { fmt } from '../data/mock'
import { useLang } from '../i18n/LanguageContext'
import { Skeleton } from './Skeleton'

// การ์ดสินค้าจิ๋วลอยมุมซ้ายล่าง - ตกแต่งอย่างเดียว (hover ได้ คลิกไม่มีผล)
function MiniProductCard({ p }) {
  return (
    <div className="flex w-[248px] items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      {p.images?.[0]
        ? <img src={p.images[0]} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain p-1" />
        : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface2 text-muted"><Icon name="image" size={20} /></span>}
      <div className="min-w-0 flex-1">
        <span className="line-clamp-1 text-xs font-semibold">{p.name}</span>
        <div className="nums mt-0.5 text-sm font-extrabold text-brand-600">฿{fmt(p.price)}</div>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white" aria-hidden="true">
        <Icon name="cart" size={16} />
      </span>
    </div>
  )
}

// โชว์เคส "หน้าจอคำสั่งซื้อ" บน hero - ประกอบจากข้อมูลสินค้าจริงใน DB (ไม่ mock)
// เป็นภาพประกอบตกแต่งล้วน: ทุกชิ้นอยู่นิ่ง มีแค่ hover effect - คลิกแล้วไม่เปลี่ยนอะไร
export default function OrderShowcase({ products = [], loading }) {
  const { t } = useLang()
  if (loading || !products.length) return <Skeleton className="aspect-[7/6] w-full rounded-2xl" />

  // เลือกสินค้าเด่นจริงมาโชว์: แนะนำ/ลดราคาขึ้นก่อน
  const sorted = [...products].sort((a, b) => (b.featured - a.featured) || (b.sale - a.sale) || (b.rating - a.rating))
  const rows = sorted.slice(0, 2)
  const card = sorted[2] || sorted[0]
  const total = rows.reduce((s, p) => s + p.price, 0)
  const steps = [
    { label: t('checkout.stepCart'), state: 'done' },
    { label: t('orders.status.paid'), state: 'done' },
    { label: t('orders.status.shipping'), state: 'now' },
  ]

  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-8 pr-1 sm:pb-10 lg:max-w-none">
      {/* การ์ดหลัก: สรุปคำสั่งซื้อ (อยู่นิ่ง - ยกตัวเฉพาะตอน hover ไม่ให้หน้าดูสั่น) */}
      <div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><Icon name="receipt" size={18} /></span>
              {t('home.showcaseOrder')}
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Icon name="check" size={12} /> {t('orders.status.paid')}
            </span>
          </div>

          {/* สถานะ 3 ขั้น: เสร็จ 2 ขั้น กำลังจัดส่ง (ไอคอนนิ่ง ไม่ใส่อนิเมชัน) */}
          <div className="mt-5 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.label} className={i < steps.length - 1 ? 'flex flex-1 items-center gap-2' : 'flex items-center gap-2'}>
                <div className="flex items-center gap-1.5">
                  {s.state === 'done' ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><Icon name="check" size={12} /></span>
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><Icon name="truck" size={12} /></span>
                  )}
                  <span className="whitespace-nowrap text-xs font-semibold">{s.label}</span>
                </div>
                {i < steps.length - 1 && <span className={`h-0.5 min-w-3 flex-1 rounded-full ${s.state === 'done' ? 'bg-emerald-500' : 'bg-line'}`} aria-hidden="true" />}
              </div>
            ))}
          </div>

          {/* รายการสินค้าจริงจาก DB - โชว์อย่างเดียว hover ได้ คลิกไม่มีผล */}
          <div className="mt-5 flex flex-col gap-2">
            {rows.map((p) => (
              <div key={p.id}
                className="flex items-center gap-3 rounded-xl border border-line p-2.5 transition-colors hover:border-brand-500 hover:bg-surface2/50">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                  : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface2 text-muted"><Icon name="image" size={18} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-muted">{p.brand}</span>
                </span>
                <span className="nums shrink-0 text-sm font-bold">฿{fmt(p.price)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">{t('cart.total')}</span>
            <span className="nums text-lg font-extrabold text-brand-600">฿{fmt(total)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface2/70 px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs font-semibold"><Icon name="qr" size={16} className="text-brand-600" /> {t('checkout.promptpay')}</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><Icon name="shield" size={13} /> {t('home.showcaseSlip')}</span>
          </div>
        </div>
      </div>

      {/* toast ชำระเงินสำเร็จ - มุมขวาบน (อยู่นิ่ง ขยับเฉพาะตอน hover) */}
      <div className="absolute -top-4 right-0 z-10">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-lg transition-transform duration-300 hover:scale-105">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white"><Icon name="check" size={14} /></span>
          <span className="text-sm font-bold">{t('checkout.paySuccess')}</span>
        </div>
      </div>

      {/* การ์ดสินค้าจริง - ทับมุมซ้ายล่างพอดีๆ ไม่บังเนื้อหาการ์ดหลัก (อยู่นิ่ง) */}
      <div className="absolute -bottom-1 -left-2 z-10 hidden sm:block lg:-left-5">
        <MiniProductCard p={card} />
      </div>
    </div>
  )
}
