import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icons'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../auth/AuthContext'
import { accountApi } from '../../lib/accountApi'
import { PageHead, Field, InfoRow, PrimaryBtn, GhostBtn, inputCls, InfoSkeleton } from './ui'

export default function Profile() {
  const { t } = useLang()
  const { reload } = useAuth()
  const [p, setP] = useState(null)
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = () => {
    accountApi.getProfile().then((r) => setP(r.profile)).catch((e) => setErr(e.message))
  }
  useEffect(() => { load() }, [])

  const startEdit = () => {
    setF({
      full_name: p.full_name || '', phone: p.phone || '', birthdate: p.birthdate || '',
      line_id: p.line_id || '', facebook: p.facebook || '',
    })
    setErr(''); setEdit(true)
  }
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setErr('')
    try {
      const body = { ...f, birthdate: f.birthdate || null, line_id: f.line_id || null, facebook: f.facebook || null }
      const r = await accountApi.updateProfile(body)
      setP(r.profile); setEdit(false)
      reload() // อัปเดตชื่อบน navbar/หัวบัญชี
    } catch (e2) { setErr(e2.message) } finally { setSaving(false) }
  }

  if (!p) return <InfoSkeleton />

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <PageHead
        title={t('account.personalInfo')}
        action={!edit && <GhostBtn onClick={startEdit}><Icon name="edit" size={16} /> {t('account.edit')}</GhostBtn>}
      />
      {err && <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{err}</div>}

      {!edit ? (
        <div>
          <InfoRow label={t('account.fullName')} value={p.full_name} />
          <InfoRow label={t('account.email')} value={p.email} />
          <InfoRow label={t('account.phone')} value={p.phone} />
          <InfoRow label={t('account.birthdate')} value={p.birthdate} />
          <InfoRow label={t('account.lineId')} value={p.line_id} />
          <InfoRow label={t('account.facebook')} value={p.facebook} />
        </div>
      ) : (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('account.fullName')}><input className={inputCls} value={f.full_name} onChange={set('full_name')} /></Field>
          <Field label={t('account.email')}><input className={inputCls} value={p.email || ''} disabled /></Field>
          <Field label={t('account.phone')}><input className={inputCls} value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" /></Field>
          <Field label={t('account.birthdate')}><input className={inputCls} value={f.birthdate} onChange={set('birthdate')} type="date" /></Field>
          <Field label={t('account.lineId')}><input className={inputCls} value={f.line_id} onChange={set('line_id')} /></Field>
          <Field label={t('account.facebook')}><input className={inputCls} value={f.facebook} onChange={set('facebook')} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <PrimaryBtn type="submit" disabled={saving}>{saving ? t('common.loading') : t('account.save')}</PrimaryBtn>
            <GhostBtn type="button" onClick={() => setEdit(false)}>{t('account.cancel')}</GhostBtn>
          </div>
        </form>
      )}
    </div>
  )
}
