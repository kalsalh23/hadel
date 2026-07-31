export function formatMoney(value, currency = 'ر.س') {
  const num = Number(value ?? 0)
  return `${num.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ${currency}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(iso) {
  if (!iso) return null
  const today = new Date(todayISO() + 'T00:00:00')
  const target = new Date(iso + 'T00:00:00')
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}
