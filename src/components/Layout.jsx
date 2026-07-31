import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: '▦' },
  { to: '/users', label: 'المستخدمون', icon: '👥' },
  { to: '/packages', label: 'الباقات', icon: '📦' },
  { to: '/subscriptions', label: 'سجل الاشتراكات', icon: '🔁' },
  { to: '/import', label: 'استيراد CSV', icon: '📥' },
  { to: '/reports', label: 'التقارير', icon: '📊' },
]

export default function Layout({ children }) {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">ح</span>
          <div>
            <h1>الحدي</h1>
            <p>نظام إدارة الشبكة</p>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{profile?.full_name?.charAt(0) || 'م'}</span>
            <div className="sidebar-user-info">
              <strong>{profile?.full_name || 'المشرف'}</strong>
              <span>مدير النظام</span>
            </div>
          </div>
          <button className="btn btn-logout" onClick={handleSignOut}>
            ⏻ تسجيل الخروج
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen(true)} aria-label="القائمة">
            ☰
          </button>
          <div className="topbar-spacer" />
          <div className="topbar-user">
            <span className="topbar-date">
              {new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </span>
            <span className="avatar">{profile?.full_name?.charAt(0) || 'م'}</span>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
