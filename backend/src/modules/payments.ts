import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { AppEnv } from '../lib/env'
import { adminClient } from '../lib/supabase'
import { badRequest, notFound, serverError } from '../lib/http'
import { jsonRes, errRes } from '../lib/openapi'

const TAG = ['Payments']
// สถานะที่ถือว่าชำระแล้ว (กันจ่ายซ้ำ)
const PAID = ['paid', 'packing', 'shipping', 'done']

export function registerPayments(app: OpenAPIHono<AppEnv>) {
  // POST /api/payments/verify-slip - ตรวจสลิปจริงด้วย EasySlip แล้วอัปเดตออเดอร์เป็นชำระแล้ว
  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/payments/verify-slip',
      tags: TAG,
      summary: 'ยืนยันสลิปโอนเงิน (EasySlip) แล้วตั้งออเดอร์เป็นชำระแล้ว',
      request: {
        body: {
          content: {
            'multipart/form-data': {
              schema: z.object({
                image: z.any().openapi({ type: 'string', format: 'binary' }),
                orderCode: z.string(),
              }),
            },
          },
        },
      },
      responses: {
        200: jsonRes('ตรวจสำเร็จ', z.object({ ok: z.literal(true), amount: z.number().optional(), transRef: z.string().nullable().optional(), already: z.boolean().optional(), message: z.string().optional() })),
        400: errRes('สลิปไม่ถูกต้อง/ยอดไม่พอ/ถูกใช้แล้ว'),
        404: errRes('ไม่พบคำสั่งซื้อ'),
        500: errRes('ตั้งค่าไม่ครบ/อัปเดตล้มเหลว'),
      },
    }),
    async (c) => {
      if (!c.env.EASYSLIP_API_TOKEN) throw serverError('ยังไม่ได้ตั้งค่า EASYSLIP_API_TOKEN')
      // verify-slip ต้องอัปเดตออเดอร์ข้าม RLS -> ต้องมี service_role (secret เดียวที่จำเป็นสำหรับฟีเจอร์นี้)
      if (!c.env.SUPABASE_SERVICE_ROLE_KEY) throw serverError('ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY (จำเป็นเฉพาะ verify-slip)')
      const form = await c.req.formData()
      const image = form.get('image')
      const orderCode = (form.get('orderCode') || '').toString().trim()
      if (!image || typeof image === 'string') throw badRequest('กรุณาแนบรูปสลิป')
      if (!orderCode) throw badRequest('ไม่มีรหัสคำสั่งซื้อ')

      // 1) ตรวจสลิปกับ EasySlip
      const es = new FormData()
      es.append('image', image)
      es.append('checkDuplicate', 'true')
      const esRes = await fetch('https://api.easyslip.com/v2/verify/bank', {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.env.EASYSLIP_API_TOKEN}` },
        body: es,
      })
      const esData: any = await esRes.json().catch(() => ({}))
      if (!esRes.ok || !esData.success) throw badRequest(esData?.message || 'ตรวจสอบสลิปไม่สำเร็จ (สลิปไม่ถูกต้อง)')
      const raw = esData.data?.rawSlip || {}
      const amount = Number(raw.amount?.amount || 0)
      const transRef = raw.transRef || null
      if (esData.data?.isDuplicate) throw badRequest('สลิปนี้ถูกใช้ไปแล้ว')

      // 2) หาออเดอร์ (service_role ข้าม RLS ฝั่ง server)
      const db = adminClient(c.env)
      const { data: order } = await db.from('orders').select('id,total,status,stock_deducted').eq('code', orderCode).maybeSingle()
      if (!order) throw notFound('ไม่พบคำสั่งซื้อ')
      if (PAID.includes(order.status)) return c.json({ ok: true as const, already: true, message: 'คำสั่งซื้อนี้ชำระแล้ว' })

      // 3) ยอดต้องพอ
      if (Math.floor(amount) < order.total) throw badRequest(`ยอดโอน ฿${amount} น้อยกว่ายอดที่ต้องชำระ ฿${order.total}`)

      // 4) ตัดสต็อกตอนจ่ายจริง (atomic, idempotent ด้วยแฟล็ก stock_deducted) แล้วตั้งเป็นชำระแล้ว
      if (!order.stock_deducted) {
        const { error: eStock } = await db.rpc('adjust_order_stock', { p_order: order.id, p_dir: -1 })
        if (eStock) throw serverError('ตัดสต็อกไม่สำเร็จ: ' + eStock.message)
      }
      const { error: upErr } = await db.from('orders')
        .update({ status: 'paid', stock_deducted: true, paid_at: new Date().toISOString() }).eq('id', order.id)
      if (upErr) throw serverError('อัปเดตสถานะไม่สำเร็จ')

      return c.json({ ok: true as const, amount, transRef })
    }
  )
}
