// แบนเนอร์สไลด์แบบโค้ด - ใช้เมื่อสไลด์ไม่ใส่รูป (หรือรูปโหลดไม่ขึ้น)
// กราฟิกล้วน ไม่มีตัวหนังสือ · คมทุกจอเพราะไม่ใช่ bitmap
// hover: มุมทั้งสี่กางออก + แสงกวาดผ่าน + glow ขยาย
export default function SlideBanner() {
  return (
    <div className="group relative h-full w-full overflow-hidden bg-zinc-950 text-white">
      {/* glow แดงสองมุม - ใช้ radial-gradient แทน filter blur (ถูกกว่ามาก
          ไม่ทำภาพกระตุก/shimmer บนจอหรือ GPU บางรุ่นตอน carousel ครอสเฟด) */}
      <span aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 transition-transform duration-700 group-hover:scale-125"
        style={{ background: 'radial-gradient(circle, rgba(220,38,38,.32) 0%, transparent 65%)' }} />
      <span aria-hidden="true" className="absolute -bottom-28 -left-24 h-96 w-96 transition-transform duration-700 group-hover:scale-125"
        style={{ background: 'radial-gradient(circle, rgba(185,28,28,.22) 0%, transparent 65%)' }} />
      {/* เส้นกริดจางๆ ให้มีมิติ - เฟดหายตรงขอบด้วย radial mask */}
      <span aria-hidden="true" className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
        }} />
      {/* แสงกวาดผ่านตอน hover - แถบ gradient นุ่มๆ (ไม่ใช้ filter blur) */}
      <span aria-hidden="true" className="absolute inset-y-[-40%] left-[-30%] w-1/4 rotate-12 transition-transform duration-700 ease-out group-hover:translate-x-[520%]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.09), transparent)' }} />

      {/* วงเล็บมุมทั้งสี่ - กางออกตอน hover */}
      {[
        'left-3 top-3 rounded-tl-lg border-l-2 border-t-2',
        'right-3 top-3 rounded-tr-lg border-r-2 border-t-2',
        'bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2',
        'bottom-3 right-3 rounded-br-lg border-b-2 border-r-2',
      ].map((pos) => (
        <span key={pos} aria-hidden="true"
          className={`absolute h-5 w-5 border-brand-500/50 transition-all duration-500 group-hover:h-9 group-hover:w-9 group-hover:border-brand-500 ${pos}`} />
      ))}
    </div>
  )
}
