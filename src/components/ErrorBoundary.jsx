import { Component } from 'react'
import { tOutside } from '../i18n/translations'

// ตาข่ายนิรภัยของทั้งแอป: error ระหว่าง render/commit (รวม cleanup ตอนเปลี่ยนหน้า)
// จะไม่ทำให้จอขาวค้างอีก - โชว์หน้ากู้คืน + log component stack ไว้ไล่ปัญหา
// (จำเป็นเพราะบางเครื่องมี extension/ฟีเจอร์เบราว์เซอร์ เช่น Edge shopping assistant
//  ที่ inject script เข้ามายุ่งกับ DOM แล้วทำ React พังนอกเหนือการควบคุมของโค้ดเรา)
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[BM Computer] UI crashed:', error)
    if (info?.componentStack) console.error('[BM Computer] component stack:', info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-600/10 text-brand-600">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-bold">{tOutside('common.crashTitle')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{tOutside('common.crashDesc')}</p>
          <button onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer">
            {tOutside('common.crashReload')}
          </button>
          <a href="/" className="mt-3 block text-sm font-semibold text-brand-600 hover:underline">{tOutside('common.crashHome')}</a>
        </div>
      </div>
    )
  }
}
