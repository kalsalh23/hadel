import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabaseReady } from '../supabaseClient'

export default function Login() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  if (!supabaseReady) {
    return (
      <div className="setup-page">
        <div className="setup-card">
          <div className="setup-logo">ح</div>
          <h1>الحدي</h1>
          <p>
            لم يتم إعداد الاتصال بقاعدة البيانات بعد. أضف مفاتيح Supabase في ملف{' '}
            <code>.env</code> ثم أعد تحميل الصفحة.
          </p>
          <a className="btn btn-primary" href="/setup">
            خطوات الإعداد
          </a>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await signIn(email, password)
      if (err) throw new Error(err.message)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="setup-logo">ح</span>
          <h1>الحدي</h1>
          <p>نظام إدارة مستخدمي الشبكة</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@alhade.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="auth-hint">النظام مخصص لفريق الإدارة فقط.</p>
      </div>
    </div>
  )
}
