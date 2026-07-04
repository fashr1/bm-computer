// สถานะออเดอร์ + กฎการตัด/คืนสต็อก (ใช้ร่วมกัน admin + payments + orders)
export const ORDER_STATUSES = [
  'pending',          // รอชำระเงิน
  'paid',             // ชำระเงินแล้ว
  'packing',          // กำลังแพ็คสินค้า
  'shipping',         // กำลังจัดส่ง
  'done',             // จัดส่งสำเร็จ
  'cancel_requested', // ขอยกเลิก (ออเดอร์ที่จ่ายแล้ว - รอแอดมินตรวจ+คืนเงิน)
  'cancel',           // ยกเลิกแล้ว
  'refunded',         // คืนเงินแล้ว
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

// สถานะที่ถือว่า "จ่ายแล้ว" = ควรตัดสต็อกไว้
export const PAID_STATES: OrderStatus[] = ['paid', 'packing', 'shipping', 'done']
// สถานะที่ถือว่า "ยกเลิก/คืนเงิน" = ควรคืนสต็อก
export const CANCELED_STATES: OrderStatus[] = ['cancel', 'refunded']

// คำนวณผลต่อสต็อกเมื่อเปลี่ยนสถานะ (idempotent ด้วยแฟล็ก stock_deducted)
// คืน dir = -1 (ตัด), +1 (คืน), 0 (ไม่ต้องทำ) + ค่า stock_deducted ใหม่
export function stockEffect(next: OrderStatus, deducted: boolean): { dir: -1 | 0 | 1; deducted: boolean } {
  if (PAID_STATES.includes(next) && !deducted) return { dir: -1, deducted: true }
  if (CANCELED_STATES.includes(next) && deducted) return { dir: 1, deducted: false }
  return { dir: 0, deducted }
}
