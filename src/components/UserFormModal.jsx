import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { todayISO, addDays } from '../utils/format'

const emptyForm = {
  full_name: '',
  username: '',
  phone: '',
  email: '',
  address: '',
  package_id: '',
  subscription_start: todayISO(),
  subscription_end: addDays(todayISO(), 30),
  monthly_price: '',
  status: 'active',
  notes: '',
}

export default function UserFormModal({ open, onClose, user }) {
  const { packages, addUser, updateUser } = useData()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (user) {
      setForm({
        full_name: user.full_name || '',
        username: user.username || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
        package_id: user.package_id || '',
        subscription_start: user.subscription_start || todayISO(),
        subscription_end: user.subscription_end || addDays(todayISO(), 30),
        monthly_price: user.monthly_price ?? '',
        status: user.status || 'active',
        notes: user.notes || '',
      })
    } else {
      setForm(emptyForm)
    }
    setError('')
  }, [open, user])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handlePackageChange(id) {
    const pkg = packages.find((p) => p.id === id)
    setForm((f) => ({
      ...f,
      package_id: id,
      monthly_price: pkg ? pkg.price : f.monthly_price,
      subscription_end: addDays(f.subscription_start, pkg?.duration_days || 30),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        full_name: form.full_name.trim(),
        username: form.username.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        package_id: form.package_id || null,
        subscription_start: form.subscription_start || null,
        subscription_end: form.subscription_end || null,
        monthly_price: Number(form.monthly_price) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (user) {
        await updateUser(user.id, payload)
      } else {
        await addUser(payload)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="field">
          <label>الاسم الكامل *</label>
          <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
        </div>
        <div className="field">
          <label>اسم المستخدم</label>
          <input type="text" value={form.username} onChange={(e) => set('username', e.target.value)} />
        </div>
        <div className="field">
          <label>رقم الجوال</label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" />
        </div>
        <div className="field">
          <label>البريد الإلكتروني</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} dir="ltr" />
        </div>
        <div className="field">
          <label>العنوان</label>
          <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="field">
          <label>الباقة</label>
          <select value={form.package_id} onChange={(e) => handlePackageChange(e.target.value)}>
            <option value="">— بدون باقة —</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatNumber(p.price)} ر.س / {p.duration_days} يوم)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>بداية الاشتراك</label>
          <input type="date" value={form.subscription_start} onChange={(e) => set('subscription_start', e.target.value)} />
        </div>
        <div className="field">
          <label>نهاية الاشتراك</label>
          <input type="date" value={form.subscription_end} onChange={(e) => set('subscription_end', e.target.value)} />
        </div>
        <div className="field">
          <label>الرسوم الشهرية (ر.س)</label>
          <input type="number" min="0" step="0.01" value={form.monthly_price} onChange={(e) => set('monthly_price', e.target.value)} dir="ltr" />
        </div>
        <div className="field">
          <label>الحالة</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="suspended">موقوف</option>
            <option value="pending">قيد الانتظار</option>
          </select>
        </div>
        <div className="field field-full">
          <label>ملاحظات</label>
          <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {error && <div className="alert alert-error field-full">{error}</div>}

        <div className="form-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '…' : user ? 'حفظ التعديلات' : 'إضافة المستخدم'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('ar-SA')
}
