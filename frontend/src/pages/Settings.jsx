import { useState, useEffect } from 'react'
import { Settings2, Mail, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { getEmailConfig, saveEmailConfig } from '../api'

export default function Settings() {
  const [form, setForm] = useState({
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', sender_name: '',
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [showPwd, setShowPwd] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getEmailConfig().then(cfg => {
      if (cfg.smtp_host) {
        setForm(f => ({
          ...f,
          smtp_host: cfg.smtp_host || '',
          smtp_port: cfg.smtp_port || 587,
          smtp_user: cfg.smtp_user || '',
          sender_name: cfg.sender_name || '',
        }))
      }
      setLoaded(true)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await saveEmailConfig({ ...form, smtp_port: Number(form.smtp_port) })
      setStatus({ type: 'success', msg: 'Email configuration saved successfully.' })
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to save config' })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings2 size={22} className="text-slate-400" /> Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure email and application preferences</p>
      </div>

      {/* Email config */}
      <div className="card">
        <p className="section-title flex items-center gap-2">
          <Mail size={15} className="text-slate-400" /> Email / SMTP Configuration
        </p>
        <p className="text-sm text-slate-400 mb-5">
          Configure SMTP to send reminder emails directly from the app. If not configured, reminders will
          open your default email client (mailto:) instead.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Sender Name</label>
              <input className="input" placeholder="Student Coordinator" value={form.sender_name}
                onChange={e => set('sender_name', e.target.value)} />
            </div>
            <div>
              <label className="label">SMTP Host</label>
              <input className="input" placeholder="smtp.gmail.com" value={form.smtp_host}
                onChange={e => set('smtp_host', e.target.value)} />
            </div>
            <div>
              <label className="label">SMTP Port</label>
              <input type="number" className="input" placeholder="587" value={form.smtp_port}
                onChange={e => set('smtp_port', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Email Address (username)</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.smtp_user}
                onChange={e => set('smtp_user', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">App Password / SMTP Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••••••"
                  value={form.smtp_password}
                  onChange={e => set('smtp_password', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                For Gmail: use an App Password (not your regular password). For Outlook: use SMTP auth.
              </p>
            </div>
          </div>

          {status && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {status.type === 'success'
                ? <CheckCircle size={15} className="flex-shrink-0" />
                : <AlertCircle size={15} className="flex-shrink-0" />}
              {status.msg}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Email Config'}
          </button>
        </form>
      </div>

      {/* Info box */}
      <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm font-medium text-blue-800 mb-1">How reminders work</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Go to any student profile and click <strong>Send Reminder</strong></li>
          <li>If SMTP is configured, the email is sent automatically</li>
          <li>If not configured, your default mail client opens with a pre-filled email</li>
          <li>The reminder includes a prompt for hours, tasks, challenges, and goals</li>
        </ul>
      </div>
    </div>
  )
}
