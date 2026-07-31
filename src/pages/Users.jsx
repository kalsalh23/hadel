import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import UserFormModal from '../components/UserFormModal'
import RenewModal from '../components/RenewModal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import { formatMoney, formatDateShort, daysUntil } from '../utils/format'

export default function Users() {
  const { users, packages, deleteUser, error } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pkgFilter, setPkgFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [renewing, setRenewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter
      const matchesPkg = pkgFilter === 'all' || u.package_id === pkgFilter
      return matchesSearch && matchesStatus && matchesPkg
    })
  }, [users, search, statusFilter, pkgFilter])

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      await deleteUser(deleting.id)
      setDeleting(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (error) return <div className="alert alert-error page-pad">{error}</div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>إدارة المستخدمين</h2>
          <p>{users.length} مستخدم على الشبكة</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
          + إضافة مستخدم
        </button>
      </div>

      <div className="filters">
        <input
          className="search-input"
          type="search"
          placeholder="بحث بالاسم أو الجوال أو اسم المستخدم…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="expired">منتهي</option>
          <option value="suspended">موقوف</option>
          <option value="pending">قيد الانتظار</option>
        </select>
        <select value={pkgFilter} onChange={(e) => setPkgFilter(e.target.value)}>
          <option value="all">كل الباقات</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الباقة</th>
                <th>نهاية الاشتراك</th>
                <th>المتبقي</th>
                <th>المستحق الشهري</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-empty">لا يوجد مستخدمون مطابقون</td>
                </tr>
              )}
              {filtered.map((u) => {
                const days = daysUntil(u.subscription_end)
                return (
                  <tr key={u.id}>
                    <td className="cell-user">
                      <span className="avatar avatar-sm">{u.full_name?.charAt(0)}</span>
                      <div>
                        <strong>{u.full_name}</strong>
                        <span className="cell-sub">{u.phone || u.username || ''}</span>
                      </div>
                    </td>
                    <td>{u.packages?.name || '—'}</td>
                    <td>{formatDateShort(u.subscription_end)}</td>
                    <td>
                      {days === null ? (
                        '—'
                      ) : days < 0 ? (
                        <span className="days-chip danger">منتهي منذ {Math.abs(days)} يوم</span>
                      ) : days <= 7 ? (
                        <span className="days-chip warn">{days} يوم</span>
                      ) : (
                        <span className="days-chip ok">{days} يوم</span>
                      )}
                    </td>
                    <td className="cell-amount">{formatMoney(u.monthly_price || u.packages?.price)}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="cell-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => { setRenewing(u) }}>
                        تجديد
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(u); setFormOpen(true) }}>
                        تعديل
                      </button>
                      <button className="btn btn-sm btn-danger-ghost" onClick={() => setDeleting(u)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      <RenewModal open={Boolean(renewing)} onClose={() => setRenewing(null)} user={renewing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="حذف المستخدم"
        message={`سيتم حذف "${deleting?.full_name}" وجميع سجل اشتراكاته نهائياً. هل أنت متأكد؟`}
      />
    </div>
  )
}
