import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cnzikqndzordynfsjfdj.supabase.co'
const SERVICE_KEY = process.env.SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const METHOD_FROM_NOTE = (notes) => {
  if (!notes) return 'cash'
  if (/شام/i.test(notes)) return 'other'
  return 'cash'
}

async function main() {
  const { data: users, error } = await supabase.from('users').select(
    'id, full_name, username, package_id, monthly_price, subscription_start, subscription_end, notes'
  )
  if (error) throw error
  console.log(`قراءة ${users.length} مستخدم`)

  const { count } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true })
  if (count > 0) {
    console.log(`يوجد ${count} سجل اشتراك بالفعل — يتم التخطي`)
    return
  }

  const rows = users.map((u) => ({
    user_id: u.id,
    package_id: u.package_id,
    amount: Number(u.monthly_price || 0),
    start_date: u.subscription_start,
    end_date: u.subscription_end,
    method: METHOD_FROM_NOTE(u.notes),
    notes: u.notes,
    created_at: `${u.subscription_start || '2026-07-01'}T10:00:00+00:00`,
  }))

  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const { error: e } = await supabase.from('subscriptions').insert(batch)
    if (e) throw e
    inserted += batch.length
    console.log(`... ${inserted} من ${rows.length}`)
  }
  console.log(`✅ تم إنشاء ${inserted} سجل اشتراك`)
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
