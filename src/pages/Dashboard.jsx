import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import StatCard from '../components/StatCard'
import LoadingScreen from '../components/LoadingScreen'
import { formatMoney, formatDateShort, daysUntil, todayISO, monthKey } from '../utils/format'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

export default function Dashboard() {
  const { users, subscriptions, loading } = useData()

  const stats = useMemo(() => {
    const today = todayISO()
    const active = users.filter((u) => u.status === 'active' && (u.subscription_end >= today))
    const expired = users.filter((u) => u.status === 'expired' || (u.subscription_end && u.subscription_end < today))
    const amountDue = expired.reduce((sum, u) => sum + Number(u.monthly_price || u.packages?.price || 0), 0)
    const expiringSoon = users
      .filter((u) => {
        const d = daysUntil(u.subscription_end)
        return d !== null && d >= 0 && d <= 7
      })
      .sort((a, b) => a.subscription_end.localeCompare(b.subscription_end))

    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: monthKey(d), label: d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }) })
    }
    const revenueByMonth = months.map((m) => {
      const total = subscriptions
        .filter((s) => monthKey(new Date(s.created_at)) === m.key)
        .reduce((sum, s) => sum + Number(s.amount || 0), 0)
      return { name: m.label, الإيرادات: total }
    })

    const totalRevenue = subscriptions.reduce((s, x) => s + Number(x.amount || 0), 0)
    const monthRevenue = subscriptions
      .filter((s) => monthKey(new Date(s.created_at)) === monthKey())
      .reduce((s, x) => s + Number(x.amount || 0), 0)

    return { active: active.length, expired: expired.length, amountDue, expiringSoon, revenueByMonth, totalRevenue, monthRevenue }
  }, [users, subscriptions])

  if (loading) return <LoadingScreen />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>لوحة التحكم</h2>
          <p>نظرة عامة على حالة الشبكة والمستحقات</p>
        </div>
        <Link to="/users" className="btn btn-primary">+ إضافة مستخدم</Link>
      </div>

      <div className="stats-grid">
        <StatCard icon="👥" label="إجمالي المستخدمين" value={users.length} tone="teal" />
        <StatCard icon="✅" label="اشتراكات نشطة" value={stats.active} sub="غير منتهية حالياً" tone="green" />
        <StatCard icon="⏰" label="اشتراكات منتهية" value={stats.expired} sub="بحاجة لتجديد" tone="wine" />
        <StatCard icon="💰" label="المبلغ المستحق" value={formatMoney(stats.amountDue)} sub={`إيرادات الشهر: ${formatMoney(stats.monthRevenue)}`} tone="gold" />
      </div>

      <div className="dashboard-grid">
        <section className="card chart-card">
          <h3>إيرادات الاشتراكات — آخر 6 أشهر</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.revenueByMonth} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sand)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-body)' }} />
              <YAxis tickFormatter={(v) => v.toLocaleString('ar-SA')} width={60} />
              <Tooltip formatter={(v) => [formatMoney(v), 'الإيرادات']} />
              <Legend />
              <Bar dataKey="الإيرادات" fill="var(--teal-700)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <h3>تنتهي اشتراكاتهم خلال 7 أيام</h3>
          {stats.expiringSoon.length === 0 ? (
            <EmptyNote text="لا توجد اشتراكات تنتهي قريباً" />
          ) : (
            <ul className="mini-list">
              {stats.expiringSoon.slice(0, 6).map((u) => (
                <li key={u.id}>
                  <div>
                    <strong>{u.full_name}</strong>
                    <span>{u.phone || '—'}</span>
                  </div>
                  <span className={`days-chip ${daysUntil(u.subscription_end) <= 2 ? 'danger' : ''}`}>
                    {formatDateShort(u.subscription_end)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/users" className="link-more">عرض كل المستخدمين ←</Link>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>أحدث الاشتراكات والتجديدات</h3>
          <Link to="/subscriptions" className="btn btn-sm btn-ghost">عرض الكل</Link>
        </div>
        {subscriptions.length === 0 ? (
          <EmptyNote text="لا توجد عمليات اشتراك مسجلة بعد" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الباقة</th>
                  <th>المبلغ</th>
                  <th>الفترة</th>
                  <th>طريقة الدفع</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.slice(0, 8).map((s) => (
                  <tr key={s.id}>
                    <td className="cell-user">
                      <span className="avatar avatar-sm">{s.users?.full_name?.charAt(0) || '؟'}</span>
                      {s.users?.full_name || 'مستخدم محذوف'}
                    </td>
                    <td>{s.packages?.name || '—'}</td>
                    <td className="cell-amount">{formatMoney(s.amount)}</td>
                    <td>
                      {formatDateShort(s.start_date)} ← {formatDateShort(s.end_date)}
                    </td>
                    <td>
                      <span className="badge badge-method">{s.method}</span>
                    </td>
                    <td>{formatDateShort(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyNote({ text }) {
  return <p className="empty-note">{text}</p>
}
