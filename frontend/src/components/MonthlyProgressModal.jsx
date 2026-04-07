import { useState, useEffect } from 'react'
import { X, CheckSquare, Square } from 'lucide-react'
import { upsertProgress } from '../api'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]

const DEFAULT_CHECKLIST = [
  { id: 'hours',      label: 'Hours submitted',                 checked: false },
  { id: 'tasks',      label: 'Tasks / projects documented',     checked: false },
  { id: 'supervisor', label: 'Supervisor feedback received',    checked: false },
  { id: 'goals',      label: 'Goals for next month defined',    checked: false },
  { id: 'attendance', label: 'Attendance / timesheet confirmed',checked: false },
]

export default function MonthlyProgressModal({ studentId, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    hours_completed: '',
    tasks_completed: '',
    challenges: '',
    goals_next_month: '',
    submission_status: 'pending',
  })
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST.map(i => ({ ...i })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) {
      setForm({
        month: existing.month,
        year: existing.year,
        hours_completed: existing.hours_completed ?? '',
        tasks_completed: existing.tasks_completed ?? '',
        challenges: existing.challenges ?? '',
        goals_next_month: existing.goals_next_month ?? '',
        submission_status: existing.submission_status ?? 'pending',
      })
      try {
        const saved = existing.checklist ? JSON.parse(existing.checklist) : null
        setChecklist(saved ?? DEFAULT_CHECKLIST.map(i => ({ ...i })))
      } catch {
        setChecklist(DEFAULT_CHECKLIST.map(i => ({ ...i })))
      }
    }
  }, [existing])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleCheck = (id) =>
    setChecklist(cl => cl.map(item => item.id === id ? { ...item, checked: !item.checked } : item))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await upsertProgress(studentId, {
        ...form,
        month: Number(form.month),
        year: Number(form.year),
        hours_completed: Number(form.hours_completed) || 0,
        checklist: JSON.stringify(checklist),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const checkedCount = checklist.filter(i => i.checked).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-slate-800">
            {existing ? 'Edit Monthly Progress' : 'Add Monthly Progress'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Month / Year / Hours */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Month</label>
              <select className="input" value={form.month}
                onChange={e => set('month', e.target.value)} disabled={!!existing}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select className="input" value={form.year}
                onChange={e => set('year', e.target.value)} disabled={!!existing}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hours</label>
              <input type="number" min="0" step="0.5" className="input"
                placeholder="0" value={form.hours_completed}
                onChange={e => set('hours_completed', e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Submission Status</label>
            <select className="input" value={form.submission_status}
              onChange={e => set('submission_status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="late">Late</option>
            </select>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Monthly Checklist</label>
              <span className="text-xs text-slate-400">{checkedCount}/{checklist.length} done</span>
            </div>
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl">
              {checklist.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="w-full flex items-center gap-2.5 text-left py-1 px-1 rounded hover:bg-slate-100 transition"
                >
                  {item.checked
                    ? <CheckSquare size={16} className="text-blue-600 flex-shrink-0" />
                    : <Square size={16} className="text-slate-300 flex-shrink-0" />}
                  <span className={`text-sm ${item.checked ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <label className="label">Tasks Completed</label>
            <textarea rows={3} className="input resize-none"
              placeholder="Describe tasks and projects completed this month..."
              value={form.tasks_completed}
              onChange={e => set('tasks_completed', e.target.value)} />
          </div>

          {/* Challenges */}
          <div>
            <label className="label">Challenges</label>
            <textarea rows={2} className="input resize-none"
              placeholder="Any challenges or blockers faced..."
              value={form.challenges}
              onChange={e => set('challenges', e.target.value)} />
          </div>

          {/* Goals */}
          <div>
            <label className="label">Goals for Next Month</label>
            <textarea rows={2} className="input resize-none"
              placeholder="What are the goals for next month..."
              value={form.goals_next_month}
              onChange={e => set('goals_next_month', e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
