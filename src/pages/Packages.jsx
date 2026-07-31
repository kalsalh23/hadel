import { useState } from 'react'
import { useData } from '../context/DataContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatMoney } from '../utils/format'

const emptyPkg = { name: '', price: '', duration_days: 30, description: '', is_active: true }

export default function Packages() {
  const { packages, users, addPackage, updatePackage, deletePackage } = useData()
  const [form, setForm] = useState(emptyPkg)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  function openAdd() {
    setEditing(null)
    setForm(emptyPkg)
    setError('')
    setOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ name: p.name, price: p.price, duration_days: p.duration_days, description: p.description || '', is_active: p.is_active })
    setError('')
    setOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        duration_days: Number(form.duration_days) || 30,
        description: form.description.trim() || null,
        is_active: form.is_active,
      }
      if (editing) await updatePackage(editing.id, payload)
      else await addPackage(payload)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const count = users.filter((u) => u.package_id === deleting.id).length
    if (count > 0) {
      alert(`لا يمكن حذف هذه الباقة لأنها مرتبطة بـ ${count} مستخدم.`)
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await deletePackage(deleting.id)
      setDeleting(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>الباقات والاشتراكات</h2>
          <p>حدّد أنواع الاشتراك وأسعارها ومددها</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ باقة جديدة</button>
      </div>

      <div className="cards-grid">
        {packages.length === 0 && <p className="empty-note">لا توجد باقات بعد — أضف الباقة الأولى.</p>}
        {packages.map((p) => {
          const userCount = users.filter((u) => u.package_id === p.id).length
          return (
            <div className={`pkg-card ${!p.is_active ? 'pkg-inactive' : ''}`} key={p.id}>
              <div className="pkg-top">
                <h3>{p.name}</h3>
                {!p.is_active && <span className="badge badge-suspended">معطلة</span>}
              </div>
              <div className="pkg-price">{formatMoney(p.price)}</div>
              <ul className="pkg-meta">
                <li><span>المدة:</span> <strong>{p.duration_days} يوم</strong></li>
                <li><span>عدد المستخدمين:</span> <strong>{userCount}</strong></li>
                <li><span>المتوقع شهرياً:</span> <strong>{formatMoney(Number(p.price) * Math.ceil(30 / Math.max(p.duration_days, 1)) * userCount)}</strong></li>
              </ul>
              {p.description && <p className="pkg-desc">{p.description}</p>}
              <div className="pkg-actions">
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}>تعديل</button>
                <button className="btn btn-sm btn-danger-ghost" onClick={() => setDeleting(p)}>حذف</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل الباقة' : 'باقة جديدة'}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>اسم الباقة *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>السعر (ر.س) *</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} dir="ltr" required />
          </div>
          <div className="field">
            <label>المدة بالأيام *</label>
            <input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} dir="ltr" required />
          </div>
          <div className="field">
            <label>الحالة</label>
            <select value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
              <option value="true">مفعّلة</option>
              <option value="false">معطلة</option>
            </select>
          </div>
          <div className="field field-full">
            <label>وصف</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <div className="alert alert-error field-full">{error}</div>}
          <div className="form-actions field-full">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '…' : editing ? 'حفظ' : 'إضافة'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="حذف الباقة"
        message={`حذف الباقة "${deleting?.name}"؟`}
      />
    </div>
  )
}
