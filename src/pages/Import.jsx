import { useState, useMemo, useRef } from 'react'
import Papa from 'papaparse'
import { useData } from '../context/DataContext'
import { supabase } from '../supabaseClient'
import LoadingScreen from '../components/LoadingScreen'

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

function hasArabic(str) {
  return /[\u0600-\u06FF]/.test(str || '')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function parseDate(value) {
  if (!value) return null
  const m = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return null
  let [, mm, dd, yy] = m
  mm = mm.padStart(2, '0')
  dd = dd.padStart(2, '0')
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

  if (!hasArabic(name) && hasArabic(raw[2])) {
    name = raw[2]
    username = raw[0]
  }
  if (!name) return null

  const paidValue = [raw[5], raw[6], raw[7], raw[8]].find((v) => v && v.trim() !== '')
  let paidStatus = ''
  if (paidValue) {
    const hint = PAID_HINTS.find((h) => h.re.test(paidValue))
    paidStatus = hint ? hint.label : 'مدفوع'
  }

  return { name, username: username || null, address, profile, price, expiry, paidStatus }
}

export default function Import() {
  const { packages, loading, addPackage, addUser, updateUser, reload } = useData()
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [skipExisting, setSkipExisting] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const parsed = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const row of rows) {
      const r = parseRow(row)
      if (!r) continue
      const key = r.username || r.name
      if (seen.has(key)) continue
      seen.add(key)
      out.push(r)
    }
    return out
  }, [rows])

  const packagesInFile = useMemo(() => {
    const map = new Map()
    parsed.forEach((r) => {
      if (r.profile) {
        const price = r.price || PACKAGE_PRICES[r.profile] || 0
        map.set(r.profile, Math.max(map.get(r.profile) || 0, price))
      }
    })
    return [...map.entries()].map(([name, price]) => ({ name, price }))
  }, [parsed])

  const expiredCount = useMemo(
    () => parsed.filter((r) => r.expiry && r.expiry < todayISO()).length,
    [parsed],
  )

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    setFileName(file.name)
    Papa.parse(file, {
      skipEmptyLines: 'greedy',
      complete: (res) => {
        let data = res.data
        if (!data.length || !Array.isArray(data[0])) {
          setError('تعذّر قراءة الملف. تأكد أنه بصيغة CSV.')
          return
        }
        const first = data[0]
        const looksLikeHeader = /الاسم|اسم المستخدم|السعر/.test(first.join(','))
        if (looksLikeHeader) data = data.slice(1)
        data = data.filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
        setRows(data)
      },
      error: (err) => setError(err.message),
    })
  }

  async function handleImport() {
    if (!parsed.length) return
    setImporting(true)
    setError('')
    setResult(null)
    try {
      let created = 0
      let updated = 0
      let skipped = 0

      const pkgMap = new Map(packages.map((p) => [p.name, p]))
      for (const p of packagesInFile) {
        if (!pkgMap.has(p.name)) {
          const data = await addPackage({
            name: p.name,
            price: p.price,
            duration_days: 30,
            description: 'مستوردة من الجرد الشهري',
            is_active: true,
          })
          pkgMap.set(p.name, data)
        }
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id, username')
        .not('username', 'is', null)
      const existingByUser = new Map((existing || []).map((u) => [u.username, u.id]))

      for (const r of parsed) {
        const pkg = pkgMap.get(r.profile)
        const payload = {
          full_name: r.name,
          username: r.username,
          address: r.address || null,
          package_id: pkg?.id || null,
          monthly_price: r.price || PACKAGE_PRICES[r.profile] || 0,
          subscription_end: r.expiry,
          subscription_start: r.expiry ? subStart(r.expiry) : null,
          status: r.expiry && r.expiry < todayISO() ? 'expired' : 'active',
          notes: r.paidStatus ? `حالة الدفع في الجرد: ${r.paidStatus}` : null,
        }

        if (r.username && existingByUser.has(r.username)) {
          if (skipExisting) {
            skipped++
            continue
          }
          await updateUser(existingByUser.get(r.username), payload)
          updated++
        } else {
          await addUser(payload)
          if (r.username) existingByUser.set(r.username, 'new')
          created++
        }
      }

      await reload()
      setResult({ created, updated, skipped })
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>استيراد بيانات الجرد</h2>
          <p>ارفع ملف CSV بصيغة الجرد الشهري لتفريغه في النظام</p>
        </div>
      </div>

      <div className="card">
        <div className="import-drop" onClick={() => fileRef.current?.click()}>
          <span className="import-icon">📄</span>
          <p>{fileName || 'اضغط لاختيار ملف CSV'}</p>
          <span className="btn btn-sm btn-primary">اختيار ملف</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
        </div>
        <p className="import-hint">
          الأعمدة المتوقعة: الاسم | العنوان | اسم المستخدم | الباقة | السعر | المدفوع | غير المدفوع | تاريخ الانتهاء
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {parsed.length > 0 && (
        <>
          <div className="card">
            <h3>معاينة البيانات</h3>
            <div className="import-stats">
              <span>عدد السجلات الصالحة: <strong>{parsed.length}</strong></span>
              <span>الباقات المكتشفة: <strong>{packagesInFile.length}</strong></span>
              <span>اشتراكات منتهية: <strong>{expiredCount}</strong></span>
            </div>
            <div className="pkg-preview">
              {packagesInFile.map((p) => (
                <span className="badge badge-method" key={p.name}>
                  {p.name} — {p.price} ر.س
                </span>
              ))}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>العنوان</th>
                    <th>اسم المستخدم</th>
                    <th>الباقة</th>
                    <th>السعر</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td className="cell-user"><strong>{r.name}</strong></td>
                      <td>{r.address || '—'}</td>
                      <td dir="ltr">{r.username || '—'}</td>
                      <td>{r.profile || '—'}</td>
                      <td className="cell-amount">{r.price || '—'}</td>
                      <td>{r.expiry || '—'}</td>
                      <td>{r.paidStatus || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && (
                <p className="import-hint">… و {parsed.length - 50} سجلاً إضافياً (سيتم استيرادها جميعاً)</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3>خيارات الاستيراد</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
              />
              تخطي المستخدمين الموجودين مسبقاً (بنفس اسم المستخدم) بدلاً من تحديثهم
            </label>

            {result && (
              <div className="alert alert-success">
                تم الاستيراد: {result.created} جديد — {result.updated} تحديث — {result.skipped} تخطي
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'جارٍ الاستيراد…' : `استيراد ${parsed.length} سجل`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
