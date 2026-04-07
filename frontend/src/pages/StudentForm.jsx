import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createStudent, updateStudent, getStudent } from '../api'

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'future', label: 'Future / Upcoming' },
  { value: 'completed', label: 'Completed' },
]

const SEMESTERS = ['Fall', 'Spring', 'Summer']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i)

const EMPTY = {
  name: '', student_id: '', email: '', cohort_semester: 'Fall',
  cohort_year: String(currentYear), status: 'active',
  internship_company: '', internship_position: '',
  internship_start: '', internship_end: '', total_hours_required: 320,
  linkedin: '', notes: '',
}

export default function StudentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getStudent(parseInt(id)).then(data => {
      // Parse stored cohort "Fall 2025" back into two fields
      const parts = (data.cohort || '').split(' ')
      const cohort_semester = SEMESTERS.includes(parts[0]) ? parts[0] : 'Fall'
      const cohort_year = parts[1] || String(currentYear)
      setForm({
        name: data.name || '',
        student_id: data.student_id || '',
        email: data.email || '',
        cohort_semester,
        cohort_year,
        status: data.status || 'active',
        internship_company: data.internship_company || '',
        internship_position: data.internship_position || '',
        internship_start: data.internship_start || '',
        internship_end: data.internship_end || '',
        total_hours_required: data.total_hours_required || 320,
        linkedin: data.linkedin || '',
        notes: data.notes || '',
      })
      setLoading(false)
    })
  }, [id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      const { cohort_semester, cohort_year, ...rest } = form
      const payload = {
        ...rest,
        cohort: `${cohort_semester} ${cohort_year}`,
        total_hours_required: Number(form.total_hours_required) || 320,
      }
      if (isEdit) {
        await updateStudent(parseInt(id), payload)
        navigate(`/students/${id}`)
      } else {
        const result = await createStudent(payload)
        navigate(`/students/${result.id}`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save student')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        to={isEdit ? `/students/${id}` : '/students'}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft size={15} /> {isEdit ? 'Back to Student' : 'Back to Students'}
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEdit ? 'Edit Student' : 'Add New Student'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="card space-y-4">
          <p className="section-title">Personal Information</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Jane Smith" value={form.name}
                onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Student ID</label>
              <input className="input" placeholder="e.g. CS-2025-001" value={form.student_id}
                onChange={e => set('student_id', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="student@university.edu" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Semester</label>
              <select className="input" value={form.cohort_semester}
                onChange={e => set('cohort_semester', e.target.value)}>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select className="input" value={form.cohort_year}
                onChange={e => set('cohort_year', e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">LinkedIn URL</label>
              <input className="input" placeholder="https://linkedin.com/in/..." value={form.linkedin}
                onChange={e => set('linkedin', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Internship Info */}
        <div className="card space-y-4">
          <p className="section-title">Internship Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company</label>
              <input className="input" placeholder="Acme Corp" value={form.internship_company}
                onChange={e => set('internship_company', e.target.value)} />
            </div>
            <div>
              <label className="label">Position / Role</label>
              <input className="input" placeholder="Software Engineer Intern" value={form.internship_position}
                onChange={e => set('internship_position', e.target.value)} />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.internship_start}
                onChange={e => set('internship_start', e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.internship_end}
                onChange={e => set('internship_end', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Total Hours Required</label>
              <input type="number" min="0" step="10" className="input" value={form.total_hours_required}
                onChange={e => set('total_hours_required', e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Used to track progress percentage. Default: 320h</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <p className="section-title">Notes</p>
          <textarea
            rows={4} className="input resize-none"
            placeholder="Any notes about this student..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save size={15} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Student'}
          </button>
          <Link to={isEdit ? `/students/${id}` : '/students'} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
