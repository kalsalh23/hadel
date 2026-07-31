import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import StatusBadge from '../components/StatusBadge'
import LoadingScreen from '../components/LoadingScreen'
import { formatMoney, formatDateShort, todayISO, monthKey } from '../utils/format'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const METHOD_LABELS = { cash: 'نقدي', transfer: 'تحويل', card: 'بطاقة', other: 'أخرى' }
const CHART_COLORS = ['var(--teal-700)', 'var(--sand)', 'var(--bronze)', 'var(--wine-700)']

export default function Reports() {
  const { users, subscriptions, loading } = useData()

  const report = useMemo(() => {
    const today = todayISO()

    const expired = users
      .filter((u) => u.status === 'expired' || (u.subscription_end && u.subscription_end < today))
      .map((u) => ({
        ...u,
        due: Number(u.monthly_price || u.packages?.price || 0),
      }))
      .sort((a, b) => a.subscription_end?.localeCompare(b.subscription_end || ''))

    const totalDue = expired.reduce((s, u) => s + u.due, 0)
    const activeCount = users.filter((u) => u.status === 'active' && u.subscription_end >= today).length

    const last12 = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      last12.push({ key: monthKey(d), name: d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }) })
    }
    const revenue = last12.map((m) => ({
      name: m.name,
      الإيرادات: subscriptions
        .filter((s) => monthKey(new Date(s.created_at)) === m.key)
        .reduce((s, x) => s + Number(x.amount || 0), 0),
    }))

    const byMethod = {}
    subscriptions.forEach((s) => {
      byMethod[s.method] = (byMethod[s.method] || 0) + Number(s.amount || 0)
    })
    const methodData = Object.entries(byMethod).map(([k, v]) => ({
      name: METHOD_LABELS[k] || k,
      value: v,
    }))

    const totalRevenue = subscriptions.reduce((s, x) => s + Number(x.amount || 0), 0)
    const avgSub = subscriptions.length
      ? totalRevenue / subscriptions.length
      : 0

    return { expired, totalDue, activeCount, revenue, methodData, totalRevenue, avgSub }
  }, [users, subscriptions])

  if (loading) return <LoadingScreen />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>التقارير</h2>
          <p>ملخص مالي وإداري للشبكة</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 طباعة التقرير</button>
      </div>

      <div className="stats-grid">
        <Stat label="إجمالي الإيرادات" value={formatMoney(report.totalRevenue)} tone="gold" />
        <Stat label="متوسط مبلغ العملية" value={formatMoney(report.avgSub)} tone="teal" />
        <Stat label="الاشتراكات النشطة" value={report.activeCount} tone="green" />
        <Stat label="المستحقات غير المسددة" value={formatMoney(report.totalDue)} tone="wine" />
      </div>

      <div className="report-grid">
        <section className="card">
          <h3>الإيرادات الشهرية — آخر 12 شهراً</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.revenue} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sand)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString('ar-SA')} width={60} />
              <Tooltip formatter={(v) => [formatMoney(v), 'الإيرادات']} />
              <Bar dataKey="الإيرادات" fill="var(--teal-700)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <h3>توزيع طرق الدفع</h3>
          {report.methodData.length === 0 ? (
            <p className="empty-note">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={report.methodData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {report.methodData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="method-legend">
            {report.methodData.map((m, i) => (
              <li key={m.name}>
                <span className="legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {m.name} — {formatMoney(m.value)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>قائمة المستحقين — اشتراكات منتهية</h3>
          <span className="summary-chip">الإجمالي المستحق: <strong>{formatMoney(report.totalDue)}</strong></span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الجوال</th>
                <th>انتهى الاشتراك</th>
                <th>المبلغ المستحق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {report.expired.length === 0 && (
                <tr><td colSpan={5} className="table-empty">ممتاز! لا توجد اشتراكات منتهية</td></tr>
              )}
              {report.expired.map((u) => (
                <tr key={u.id}>
                  <td className="cell-user">
                    <span className="avatar avatar-sm">{u.full_name?.charAt(0)}</span>
                    <strong>{u.full_name}</strong>
                  </td>
                  <td dir="ltr">{u.phone || '—'}</td>
                  <td>{formatDateShort(u.subscription_end)}</td>
                  <td className="cell-amount cell-due">{formatMoney(u.due)}</td>
                  <td><StatusBadge status={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  )
}
