import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { todayISO, addDays } from '../utils/format'

export default function RenewModal({ open, onClose, user }) {
  const { packages, renewUser } = useData()
  const [form, setForm] = useState({
    package_id: '',
    amount: '',
    start_date: todayISO(),
    end_date: addDays(todayISO(), 30),
    method: 'cash',
    notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    const baseDate = user.subscription_end && user.subscription_end >= todayISO()
      ? addDays(user.subscription_end, 1)
      : todayISO()
    setForm({
      package_id: user.package_id || '',
      amount: user.packages?.price ?? user.monthly_price ?? '',
      start_date: baseDate,
      end_date: addDays(baseDate, user.packages?.duration_days || 30),
      method: 'cash',
      notes: '',
    })
    setError('')
  }, [open, user])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handlePackageChange(id) {
    const pkg = packages.find((p) => p.id === id)
    if (!pkg) {
      set('package_id', '')
      return
    }
    setForm((f) => ({
      ...f,
      package_id: id,
      amount: pkg.price,
      end_date: addDays(f.start_date, pkg.duration_days),
    }))
  }

  function handleStartChange(v) {
    const pkg = packages.find((p) => p.id === form.package_id)
    setForm((f) => ({
      ...f,
      start_date: v,
      end_date: pkg ? addDays(v, pkg.duration_days) : f.end_date,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      setError('الرجاء إدخال مبلغ صحيح')
      return
    }
    if (!form.start_date || !form.end_date) {
      setError('الرجاء تحديد الفترة')
      return
    }
    setSaving(true)
    setError('')
    try {
      await renewUser(user.id, {
        packageId: form.package_id || null,
        amount: Number(form.amount),
        startDate: form.start_date,
        endDate: form.end_date,
        method: form.method,
        notes: form.notes.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`تجديد اشتراك: ${user.full_name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="renew-summary field-full">
          <p>
            المبلغ المستحق حالياً:{' '}
            <strong>
              {formatNum(user.monthly_price || user.packages?.price)} ر.س
            </strong>
          </p>
          <p>
            الاشتراك الحالي ينتهي:{' '}
            <strong>{user.subscription_end || '—'}</strong>
          </p>
        </div>

        <div className="field">
          <label>الباقة</label>
          <select value={form.package_id} onChange={(e) => handlePackageChange(e.target.value)}>
            <option value="">— بدون باقة —</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatNum(p.price)} ر.س / {p.duration_days} يوم
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>المبلغ المدفوع (ر.س) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            dir="ltr"
            required
          />
        </div>
        <div className="field">
          <label>بداية الفترة الجديدة</label>
          <input type="date" value={form.start_date} onChange={(e) => handleStartChange(e.target.value)} />
        </div>
        <div className="field">
          <label>نهاية الفترة الجديدة</label>
          <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
        <div className="field">
          <label>طريقة الدفع</label>
          <select value={form.method} onChange={(e) => set('method', e.target.value)}>
            <option value="cash">نقدي</option>
            <option value="transfer">تحويل بنكي</option>
            <option value="card">بطاقة</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div className="field">
          <label>ملاحظات</label>
          <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {error && <div className="alert alert-error field-full">{error}</div>}

        <div className="form-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '…' : 'تأكيد التجديد والدفع'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('ar-SA')
}
