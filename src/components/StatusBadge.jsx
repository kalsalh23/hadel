const statusMeta = {
  active: { label: 'نشط', cls: 'badge-active' },
  expired: { label: 'منتهي', cls: 'badge-expired' },
  suspended: { label: 'موقوف', cls: 'badge-suspended' },
  pending: { label: 'قيد الانتظار', cls: 'badge-pending' },
}

export default function StatusBadge({ status }) {
  const meta = statusMeta[status] || { label: status, cls: 'badge-pending' }
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>
}
