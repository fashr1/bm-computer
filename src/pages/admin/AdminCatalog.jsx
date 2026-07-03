import { useState } from 'react'
import { Icon, iconNames } from '../../components/Icons'
import { fetchCategories, fetchBrands, saveCategory, deleteCategory, saveBrand, deleteBrand } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useLang } from '../../i18n/LanguageContext'
import { TableSkeleton } from '../../components/Skeleton'
import { brandLogo } from '../../lib/brands'

const input = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
const slugify = (s) => s.toString().toLowerCase().trim().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/(^-|-$)/g, '')

// จัดการหมวดหมู่ + แบรนด์จากหลังบ้าน - แก้แล้วขึ้นหน้าเว็บทันที (nav/กริดหมวด/ตัวกรอง มาจาก DB)
export default function AdminCatalog() {
  return (
    <div className="flex flex-col gap-8">
      <CategoriesSection />
      <BrandsSection />
    </div>
  )
}

function CategoriesSection() {
  const { t } = useLang()
  const [key, setKey] = useState(0)
  const { data, loading } = useFetch(() => fetchCategories(), [key])
  const [editing, setEditing] = useState(null)
  const rows = data || []

  const onDelete = async (c) => {
    if (!confirm(t('admin.confirmDelCategory', { name: c.name_th }))) return
    try { await deleteCategory(c.id); setKey((k) => k + 1) } catch (e) { alert(`${t('admin.delFail')}: ${e.message}`) }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">{t('admin.manageCategories')} ({rows.length})</h3>
        <button onClick={() => setEditing({})} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 cursor-pointer">
          <Icon name="plus" size={16} /> {t('admin.addCategory')}
        </button>
      </div>
      {loading ? <TableSkeleton rows={4} cols={5} /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl border border-line">
            <thead><tr className="bg-surface2 text-left text-xs text-muted">
              <th className="p-3">{t('admin.iconLabel')}</th><th className="p-3">Slug</th><th className="p-3">{t('admin.catNameTh')}</th><th className="p-3">{t('admin.catNameEn')}</th><th className="p-3">{t('admin.sort')}</th><th className="p-3">{t('admin.colManage')}</th>
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line text-sm hover:bg-surface2/50">
                  <td className="p-3"><Icon name={c.icon || 'box'} size={18} className="text-brand-600" /></td>
                  <td className="p-3 text-muted">{c.slug}</td>
                  <td className="p-3">{c.name_th}</td>
                  <td className="p-3">{c.name_en}</td>
                  <td className="nums p-3">{c.sort}</td>
                  <td className="whitespace-nowrap p-3">
                    <button onClick={() => setEditing(c)} className="rounded p-1.5 hover:bg-surface2 hover:text-brand-600 cursor-pointer" title={t('admin.edit')}><Icon name="edit" size={16} /></button>
                    <button onClick={() => onDelete(c)} className="rounded p-1.5 text-brand-600 hover:bg-surface2 cursor-pointer" title={t('admin.del')}><Icon name="trash" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <CategoryForm cat={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setKey((k) => k + 1) }} />}
    </section>
  )
}

function CategoryForm({ cat, onClose, onSaved }) {
  const { t } = useLang()
  const [f, setF] = useState({ id: cat.id, slug: cat.slug || '', name_th: cat.name_th || '', name_en: cat.name_en || '', icon: cat.icon || 'box', sort: cat.sort ?? 0 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.name_th || !f.name_en) { setErr(t('admin.fillCatRequired')); return }
    setSaving(true)
    try { await saveCategory({ ...f, slug: f.slug || slugify(f.name_en || f.name_th) }); onSaved() }
    catch (e2) { setErr(e2.message || t('admin.saveFail')) } finally { setSaving(false) }
  }

  return (
    <Modal title={cat.id ? t('admin.editCategory') : t('admin.addCategory')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {err && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.catNameTh')}><input className={input} value={f.name_th} onChange={set('name_th')} /></Field>
          <Field label={t('admin.catNameEn')}><input className={input} value={f.name_en} onChange={(e) => setF((s) => ({ ...s, name_en: e.target.value, slug: s.slug || slugify(e.target.value) }))} /></Field>
          <Field label="Slug (URL)"><input className={input} value={f.slug} onChange={set('slug')} placeholder="auto" /></Field>
          <Field label={t('admin.sort')}><input className={input} type="number" value={f.sort} onChange={set('sort')} /></Field>
        </div>
        <Field label={t('admin.iconLabel')}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-surface2"><Icon name={f.icon || 'box'} size={20} className="text-brand-600" /></span>
            <select className={input} value={f.icon || 'box'} onChange={set('icon')}>
              {iconNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Field>
        <FormButtons saving={saving} onClose={onClose} />
      </form>
    </Modal>
  )
}

function BrandsSection() {
  const { t } = useLang()
  const [key, setKey] = useState(0)
  const { data, loading } = useFetch(() => fetchBrands(), [key])
  const [editing, setEditing] = useState(null)
  const rows = data || []

  const onDelete = async (b) => {
    if (!confirm(t('admin.confirmDelBrand', { name: b.name }))) return
    try { await deleteBrand(b.id); setKey((k) => k + 1) } catch (e) { alert(`${t('admin.delFail')}: ${e.message}`) }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">{t('admin.manageBrands')} ({rows.length})</h3>
        <button onClick={() => setEditing({})} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 cursor-pointer">
          <Icon name="plus" size={16} /> {t('admin.addBrand')}
        </button>
      </div>
      {loading ? <TableSkeleton rows={5} cols={4} /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl border border-line">
            <thead><tr className="bg-surface2 text-left text-xs text-muted">
              <th className="p-3">{t('admin.brandLogo')}</th><th className="p-3">{t('admin.brandName')}</th><th className="p-3">Slug</th><th className="p-3">{t('admin.sort')}</th><th className="p-3">{t('admin.colManage')}</th>
            </tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-line text-sm hover:bg-surface2/50">
                  <td className="p-3">
                    <span className="grid h-9 w-16 place-items-center rounded bg-white p-1">
                      <BrandImg b={b} />
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{b.name}</td>
                  <td className="p-3 text-muted">{b.slug}</td>
                  <td className="nums p-3">{b.sort}</td>
                  <td className="whitespace-nowrap p-3">
                    <button onClick={() => setEditing(b)} className="rounded p-1.5 hover:bg-surface2 hover:text-brand-600 cursor-pointer" title={t('admin.edit')}><Icon name="edit" size={16} /></button>
                    <button onClick={() => onDelete(b)} className="rounded p-1.5 text-brand-600 hover:bg-surface2 cursor-pointer" title={t('admin.del')}><Icon name="trash" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <BrandForm brand={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setKey((k) => k + 1) }} />}
    </section>
  )
}

function BrandImg({ b }) {
  const [err, setErr] = useState(false)
  const src = brandLogo(b.slug, b.logo_url)
  if (err || !src) return <span className="text-[10px] font-bold text-zinc-600">{b.name}</span>
  return <img src={src} alt={b.name} className="max-h-7 max-w-[56px] object-contain" onError={() => setErr(true)} />
}

function BrandForm({ brand, onClose, onSaved }) {
  const { t } = useLang()
  const [f, setF] = useState({ id: brand.id, slug: brand.slug || '', name: brand.name || '', logo_url: brand.logo_url || '', sort: brand.sort ?? 0 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.name) { setErr(t('admin.fillBrandRequired')); return }
    setSaving(true)
    try { await saveBrand({ ...f, slug: f.slug || slugify(f.name) }); onSaved() }
    catch (e2) { setErr(e2.message || t('admin.saveFail')) } finally { setSaving(false) }
  }

  return (
    <Modal title={brand.id ? t('admin.editBrand') : t('admin.addBrand')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {err && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.brandName')}><input className={input} value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value, slug: s.slug || slugify(e.target.value) }))} /></Field>
          <Field label="Slug (URL)"><input className={input} value={f.slug} onChange={set('slug')} placeholder="auto" /></Field>
          <Field label={t('admin.brandLogoUrl')} className="sm:col-span-2"><input className={input} value={f.logo_url} onChange={set('logo_url')} placeholder="https://..." /></Field>
          <Field label={t('admin.sort')}><input className={input} type="number" value={f.sort} onChange={set('sort')} /></Field>
        </div>
        <span className="text-xs text-muted">{t('admin.brandLogoHint')}</span>
        <FormButtons saving={saving} onClose={onClose} />
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface2 cursor-pointer"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return <div className={className}><label className="mb-1.5 block text-sm font-semibold">{label}</label>{children}</div>
}

function FormButtons({ saving, onClose }) {
  const { t } = useLang()
  return (
    <div className="mt-3 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-surface2 cursor-pointer">{t('admin.cancel')}</button>
      <button disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 cursor-pointer">{saving ? t('admin.saving') : t('admin.save')}</button>
    </div>
  )
}
