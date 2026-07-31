import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import LoadingScreen from '../components/LoadingScreen'
import { formatMoney, formatDateShort, monthKey } from '../utils/format'

export default function Subscriptions() {
  const { subscriptions, loading } = useData()
  const [method, setMethod] = useState('all')
  const [month, setMonth] = useState('all')
  const [search, setSearch] = useState('')

  const months = useMemo(() => {
    const set = new Set()
    subscriptions.forEach((s) => set.add(monthKey(new Date(s.created_at))))
    return [...set].sort().reverse()
  }, [subscriptions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subscriptions.filter((s) => {
      const m = monthKey(new Date(s.created_at))
      const matchesMethod = method === 'all' || s.method === method
      const matchesMonth = month === 'all' || m === month
      const matchesSearch =
        !q || (s.users?.full_name || '').toLowerCase().includes(q) || (s.users?.phone || '').includes(q)
      return matchesMethod && matchesMonth && matchesSearch
    })
  }, [subscriptions, method, month, search])

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, s) => sum + Number(s.amount || 0), 0)
    const byMethod = {}
    filtered.forEach((s) => {
      byMethod[s.method] = (byMethod[s.method] || 0) + Number(s.amount || 0)
    })
    return { total, byMethod }
  }, [filtered])

  if (loading) return <LoadingScreen />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>سجل الاشتراكات والتجديدات</h2>
          <p>جميع عمليات الاشتراك والدفع</p>
        </div>
        <div className="summary-chip">
          الإجمالي المصفّى: <strong>{formatMoney(totals.total)}</strong>
        </div>
      </div>

      <div className="filters">
        <input
          className="search-input"
          type="search"
          placeholder="بحث باسم المستخدم أو جواله…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="all">كل طرق الدفع</option>
          <option value="cash">نقدي</option>
          <option value="transfer">تحويل</option>
          <option value="card">بطاقة</option>
          <option value="other">أخرى</option>
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">كل الأشهر</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المستخدم</th>
                <th>الباقة</th>
                <th>الفترة</th>
                <th>المبلغ</th>
                <th>الدفع</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-empty">لا توجد عمليات مطابقة</td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{formatDateShort(s.created_at)}</td>
                  <td className="cell-user">
                    <span className="avatar avatar-sm">{s.users?.full_name?.charAt(0) || '؟'}</span>
                    <div>
                      <strong>{s.users?.full_name || 'مستخدم محذوف'}</strong>
                      <span className="cell-sub">{s.users?.phone || ''}</span>
                    </div>
                  </td>
                  <td>{s.packages?.name || '—'}</td>
                  <td>{formatDateShort(s.start_date)} ← {formatDateShort(s.end_date)}</td>
                  <td className="cell-amount">{formatMoney(s.amount)}</td>
                  <td><span className="badge badge-method">{s.method}</span></td>
                  <td>{s.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
