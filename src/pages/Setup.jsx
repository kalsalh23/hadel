import { useState } from 'react'
import { supabaseReady } from '../supabaseClient'

const steps = [
  {
    title: '1. إنشاء مشروع في Supabase',
    body: 'ادخل إلى supabase.com، أنشئ حساباً جديداً، ثم اضغط "New Project" وأعطه اسماً (مثال: alhade).',
  },
  {
    title: '2. تنفيذ مخطط قاعدة البيانات',
    body: 'افتح صفحة SQL Editor داخل المشروع، انسخ محتوى ملف supabase/schema.sql والصقه ثم نفّذه بزر "Run".',
  },
  {
    title: '3. تفعيل المصادقة',
    body: 'من Authentication → Providers تأكد أن Email هو مفعّل، وعطّل "Confirm email" إن أردت دخولاً فورياً دون تأكيد بريد.',
  },
  {
    title: '4. نسخ المفاتيح',
    body: 'من Settings → API انسخ Project URL و anon public key وضعهما في ملف .env كما في المثال .env.example ثم أعد تشغيل خادم التطوير.',
  },
]

export default function Setup() {
  const [env, setEnv] = useState('')

  function copyEnv() {
    const text = `VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`
    navigator.clipboard?.writeText(text)
    setEnv(text)
  }

  return (
    <div className="setup-page">
      <div className="setup-card setup-wide">
        <div className="setup-logo">ح</div>
        <h1>خطوات إعداد نظام الحدي</h1>
        <p className="setup-intro">
          {supabaseReady
            ? 'تم رصد مفاتيح الاتصال. إن أردت إعادة الإعداد أكمل الخطوات التالية.'
            : 'اتبع هذه الخطوات لتوصيل النظام بقاعدة بيانات Supabase.'}
        </p>

        <div className="setup-steps">
          {steps.map((s) => (
            <div className="setup-step" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="setup-env">
          <h3>محتوى ملف .env</h3>
          <pre>{env || 'VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY'}</pre>
          <button className="btn btn-primary" onClick={copyEnv}>
            نسخ إلى الحافظة
          </button>
        </div>

        <a className="btn btn-ghost" href="/login">
          العودة لتسجيل الدخول
        </a>
      </div>
    </div>
  )
}
