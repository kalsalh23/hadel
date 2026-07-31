import fs from 'fs'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cnzikqndzordynfsjfdj.supabase.co'
const SERVICE_KEY = process.env.SERVICE_KEY
const CSV_PATH = process.env.CSV_PATH

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const PACKAGE_PRICES = {
  'SPEED_1M': 6, 'SPEED_2M': 8, 'SPEED_3M': 12,
  'SPEED_4M': 16, 'SPEED_5M': 18, 'SPEED_10M': 35,
  '1M': 4, '2M': 7,
}

const PAID_HINTS = [
  { re: /شام|شيم/i, label: 'شام كاش' },
  { re: /احمد|أحمد/i, label: 'احمد' },
  { re: /عدي|عدى/i, label: 'عدي' },
  { re: /كاش|نقد/i, label: 'كاش' },
]

function hasArabic(str) { return /[\u0600-\u06FF]/.test(str || '') }

function todayISO() { return new Date().toISOString().slice(0, 10) }

function parseDate(value) {
  if (!value) return null
  const m = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return null
  let [, mm, dd, yy] = m
  mm = mm.padStart(2, '0'); dd = dd.padStart(2, '0')
  if (yy.length === 2) yy = '20' + yy
  return `${yy}-${mm}-${dd}`
}

function subStart(expiry) {
  const d = new Date(expiry + 'T00:00:00')
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function parseRow(row) {
  const raw = row.map((c) => String(c ?? '').trim())
  let name = raw[0]
  let username = raw[2]
  const address = raw[1]
  const profile = raw[3]
  const price = Number(raw[4])
  const expiry = parseDate(raw[9])
  if (!hasArabic(name) && hasArabic(raw[2])) { name = raw[2]; username = raw[0] }
  if (!name) return null
  const paidValue = [raw[5], raw[6], raw[7], raw[8]].find((v) => v && v.trim() !== '')
  let paidStatus = ''
  if (paidValue) {
    const hint = PAID_HINTS.find((h) => h.re.test(paidValue))
    paidStatus = hint ? hint.label : 'مدفوع'
  }
  return { name, username: username || null, address, profile, price, expiry, paidStatus }
}

function parseCsv(path) {
  const file = fs.readFileSync(path, 'utf8')
  const res = Papa.parse(file, { skipEmptyLines: 'greedy' })
  let data = res.data
  if (!data.length || !Array.isArray(data[0])) throw new Error('CSV فارغ')
  if (/الاسم|اسم المستخدم|السعر/.test(data[0].join(','))) data = data.slice(1)
  data = data.filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
  const seen = new Set()
  const out = []
  for (const row of data) {
    const r = parseRow(row)
    if (!r) continue
    const key = r.username || r.name
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

async function seedPackages(parsed) {
  const map = new Map()
  parsed.forEach((r) => {
    if (r.profile) {
      const price = r.price || PACKAGE_PRICES[r.profile] || 0
      map.set(r.profile, Math.max(map.get(r.profile) || 0, price))
    }
  })
  const { data: existing } = await supabase.from('packages').select('id, name')
  const existingByName = new Map((existing || []).map((p) => [p.name, p.id]))
  const idMap = new Map()
  for (const [name, price] of map.entries()) {
    if (!existingByName.has(name)) {
      const { data, error } = await supabase.from('packages').insert({
        name, price, duration_days: 30,
        description: 'مستوردة من الجرد الشهري', is_active: true,
      }).select('id').single()
      if (error) throw error
      idMap.set(name, data.id)
    } else {
      idMap.set(name, existingByName.get(name))
    }
  }
  return idMap
}

async function seedUsers(parsed, pkgIds) {
  const today = todayISO()
  const rows = parsed.map((r) => ({
    full_name: r.name,
    username: r.username,
    address: r.address || null,
    package_id: pkgIds.get(r.profile) || null,
    monthly_price: r.price || PACKAGE_PRICES[r.profile] || 0,
    subscription_end: r.expiry,
    subscription_start: r.expiry ? subStart(r.expiry) : null,
    status: r.expiry && r.expiry < today ? 'expired' : 'active',
    notes: r.paidStatus ? `حالة الدفع في الجرد: ${r.paidStatus}` : null,
  }))

  const { count: existingCount } = await supabase.from('users').select('id', { count: 'exact', head: true })
  if (existingCount > 0) {
    console.log(`تم تجاوز الاستيراد — يوجد ${existingCount} مستخدم في الجدول بالفعل`)
    return 0
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const { error } = await supabase.from('users').insert(batch)
    if (error) throw error
    inserted += batch.length
    console.log(`... تم ${inserted} من ${rows.length}`)
  }
  return inserted
}

async function main() {
  const parsed = parseCsv(CSV_PATH)
  console.log(`قراءة ${parsed.length} مستخدماً من CSV`)
  const pkgIds = await seedPackages(parsed)
  console.log(`الباقات: ${[...pkgIds.keys()].join(', ')}`)
  const inserted = await seedUsers(parsed, pkgIds)
  console.log(`✅ تم استيراد ${inserted} مستخدم`)
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
