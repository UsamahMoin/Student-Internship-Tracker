import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Building2, Clock, FileText, ChevronRight, Trash2 } from 'lucide-react'
import { listStudents, deleteStudent } from '../api'
import StatusBadge from '../components/StatusBadge'

const TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'future', label: 'Future' },
  { value: 'completed', label: 'Completed' },
]

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await listStudents({ status: tab || undefined, search: search || undefined })
    setStudents(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [tab, search])

  const handleDelete = async (e, id) => {
    e.preventDefault()
    if (!confirm('Delete this student and all their data?')) return
    await deleteStudent(id)
    load()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-slate-500 text-sm mt-1">{students.length} student{students.length !== 1 ? 's' : ''} found</p>
        </div>
        <Link to="/students/new" className="btn-primary">
          <Plus size={16} />
          Add Student
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, company, university..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : students.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Search size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-600">No students found</p>
          <p className="text-sm mt-1">Try adjusting your search or add a new student</p>
          <Link to="/students/new" className="btn-primary mt-5 inline-flex">
            <Plus size={16} /> Add Student
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {students.map(s => {
            const pct = s.total_hours_required > 0
              ? Math.min(100, Math.round((s.total_hours_completed / s.total_hours_required) * 100))
              : 0
            return (
              <Link
                key={s.id}
                to={`/students/${s.id}`}
                className="card flex items-center gap-5 hover:shadow-md hover:border-blue-100 transition group p-4"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {s.internship_company && (
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {s.internship_company}
                        {s.internship_position && ` · ${s.internship_position}`}
                      </span>
                    )}
                    {s.university && (
                      <span className="text-slate-400">{s.university}</span>
                    )}
                  </div>
                </div>

                {/* Hours */}
                <div className="flex-shrink-0 w-36">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={11} /> Hours
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {s.total_hours_completed}/{s.total_hours_required}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Docs */}
                {s.document_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                    <FileText size={12} /> {s.document_count}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={e => handleDelete(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-600 flex-shrink-0 transition"
                  title="Delete student"
                >
                  <Trash2 size={15} />
                </button>

                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
