import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Clock, CheckCircle, Hourglass, AlertCircle, ArrowRight,
  TrendingUp, X, ArrowUpDown, ArrowUp, ArrowDown, Plus,
} from 'lucide-react'
import { getStats, listStudents } from '../api'
import StatusBadge from '../components/StatusBadge'

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card text-left flex items-start gap-4 hover:shadow-md hover:border-blue-100 transition-all group cursor-pointer w-full"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-400 ml-auto mt-1 flex-shrink-0 transition" />
    </button>
  )
}

// ── Student row inside the panel ──────────────────────────────────────────────
function PanelStudentRow({ s, showHours = false }) {
  const pct = s.total_hours_required > 0
    ? Math.min(100, Math.round((s.total_hours_completed / s.total_hours_required) * 100))
    : 0
  return (
    <Link
      to={`/students/${s.id}`}
      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {s.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
          <StatusBadge status={s.status} size="xs" />
        </div>
        <p className="text-xs text-slate-400 truncate">
          {s.internship_company
            ? `${s.internship_position || 'Intern'} @ ${s.internship_company}`
            : s.cohort || '—'}
        </p>
      </div>
      {showHours && (
        <div className="flex-shrink-0 w-32 text-right">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            {s.total_hours_completed}h / {s.total_hours_required}h
          </p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />
    </Link>
  )
}

// ── Side panel/drawer ─────────────────────────────────────────────────────────
function Panel({ panel, onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoursDir, setHoursDir] = useState('desc')

  const sortHours = useCallback((dir, list) => {
    return [...list].sort((a, b) =>
      dir === 'desc'
        ? b.total_hours_completed - a.total_hours_completed
        : a.total_hours_completed - b.total_hours_completed
    )
  }, [])

  useEffect(() => {
    if (!panel) return
    setLoading(true)
    const params = {}
    if (panel.status)  params.status  = panel.status
    if (panel.pending) params.pending = true
    listStudents(params).then(data => {
      const sorted = panel.type === 'hours' ? sortHours('desc', data) : data
      setStudents(sorted)
      setLoading(false)
    })
  }, [panel])

  const handleHoursSort = () => {
    const next = hoursDir === 'desc' ? 'asc' : 'desc'
    setHoursDir(next)
    setStudents(s => sortHours(next, s))
  }

  if (!panel) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">{panel.title}</h2>
            {!loading && (
              <p className="text-xs text-slate-400 mt-0.5">{students.length} student{students.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {panel.type === 'hours' && !loading && (
              <button
                onClick={handleHoursSort}
                className="btn-secondary py-1.5 px-3 text-xs gap-1.5"
                title={hoursDir === 'desc' ? 'Highest first' : 'Lowest first'}
              >
                {hoursDir === 'desc'
                  ? <><ArrowDown size={12} /> Highest first</>
                  : <><ArrowUp size={12} /> Lowest first</>}
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No students found</p>
            </div>
          ) : (
            students.map(s => (
              <PanelStudentRow
                key={s.id}
                s={s}
                showHours={panel.type === 'hours'}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3">
          <Link to="/students" onClick={onClose} className="btn-secondary w-full justify-center text-sm">
            View full Students page
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentActive, setRecentActive] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null)

  useEffect(() => {
    Promise.all([getStats(), listStudents({ status: 'active' })]).then(([s, st]) => {
      setStats(s)
      setRecentActive(st.slice(0, 3))
      setLoading(false)
    })
  }, [])

  const open = (type, title, extra = {}) => setPanel({ type, title, ...extra })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Click any card to view the student list</p>
        </div>

        {/* Stats grid — all clickable */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total Students"
            value={stats.total_students}
            color="bg-blue-100 text-blue-600"
            sub={`${stats.active_students} active · ${stats.future_students} upcoming`}
            onClick={() => open('all', 'All Students')}
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={stats.completed_students}
            color="bg-emerald-100 text-emerald-600"
            sub="finished the program"
            onClick={() => open('completed', 'Completed Students', { status: 'completed' })}
          />
          <StatCard
            icon={Clock}
            label="Total Hours Logged"
            value={Number(stats.total_hours_logged).toFixed(0)}
            color="bg-purple-100 text-purple-600"
            sub="tap to sort by student"
            onClick={() => open('hours', 'Hours by Student')}
          />
          <StatCard
            icon={Hourglass}
            label="Upcoming Students"
            value={stats.future_students}
            color="bg-amber-100 text-amber-600"
            sub="not yet started"
            onClick={() => open('future', 'Upcoming Students', { status: 'future' })}
          />
          <StatCard
            icon={AlertCircle}
            label="Pending Submissions"
            value={stats.pending_submissions}
            color="bg-red-100 text-red-500"
            sub="updates still needed"
            onClick={() => open('pending', 'Pending Submissions', { pending: true })}
          />
          <StatCard
            icon={TrendingUp}
            label="Active Interns"
            value={stats.active_students}
            color="bg-indigo-100 text-indigo-600"
            sub="currently in program"
            onClick={() => open('active', 'Active Interns', { status: 'active' })}
          />
        </div>

        {/* Recent active students */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <p className="section-title mb-0">Recent Active Students</p>
            <Link to="/students" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recentActive.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active students yet</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {recentActive.map(s => {
                const pct = s.total_hours_required > 0
                  ? Math.min(100, Math.round((s.total_hours_completed / s.total_hours_required) * 100))
                  : 0
                return (
                  <Link
                    key={s.id}
                    to={`/students/${s.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        <StatusBadge status={s.status} size="xs" />
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {s.internship_company
                          ? `${s.internship_position || 'Intern'} @ ${s.internship_company}`
                          : s.cohort || 'No company assigned'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 w-28">
                      <p className="text-xs text-slate-500 mb-1">{s.total_hours_completed}h / {s.total_hours_required}h</p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Add student button always visible */}
          <Link to="/students/new" className="btn-primary w-full justify-center">
            <Plus size={15} /> Add Student
          </Link>
        </div>
      </div>

      {/* Side panel */}
      <Panel panel={panel} onClose={() => setPanel(null)} />
    </>
  )
}
