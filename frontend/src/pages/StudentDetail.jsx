import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Mail, Phone, Building2, Calendar, Clock,
  Plus, Trash2, Send, AlertCircle, CheckCircle, Linkedin,
  BookOpen, FileText, TrendingUp, FileDown, CheckSquare, Square,
  MailOpen,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getStudent, deleteProgress, sendReminder, reportUrl } from '../api'
import StatusBadge from '../components/StatusBadge'
import MonthlyProgressModal from '../components/MonthlyProgressModal'
import DocumentsSection from '../components/DocumentsSection'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']

function InfoRow({ icon: Icon, label, value, href }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{value}</a>
          : <p className="text-sm text-slate-800">{value}</p>}
      </div>
    </div>
  )
}

function ChecklistDisplay({ checklistJson }) {
  let items = []
  try { items = checklistJson ? JSON.parse(checklistJson) : [] } catch { return null }
  if (!items.length) return null
  const done = items.filter(i => i.checked).length
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-slate-400 mb-1">Checklist: {done}/{items.length}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-1.5">
            {item.checked
              ? <CheckSquare size={12} className="text-emerald-500 flex-shrink-0" />
              : <Square size={12} className="text-slate-300 flex-shrink-0" />}
            <span className={`text-xs ${item.checked ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [editingProgress, setEditingProgress] = useState(null)
  const [activeTab, setActiveTab] = useState('progress')
  const [reminderStatus, setReminderStatus] = useState(null)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [sendingUpdateReq, setSendingUpdateReq] = useState(null) // progress id

  const load = async () => {
    const data = await getStudent(parseInt(id))
    setStudent(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleDeleteProgress = async (progressId) => {
    if (!confirm('Delete this progress entry?')) return
    await deleteProgress(progressId)
    load()
  }

  const handleSendReminder = async () => {
    setSendingReminder(true)
    setReminderStatus(null)
    try {
      const result = await sendReminder(parseInt(id))
      if (result.type === 'mailto') {
        window.open(result.link, '_blank')
        setReminderStatus({ type: 'info', msg: 'Email client opened with pre-filled reminder.' })
      } else {
        setReminderStatus({ type: 'success', msg: result.message })
      }
    } catch (err) {
      setReminderStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to send reminder' })
    } finally {
      setSendingReminder(false)
    }
  }

  const handleRequestMonthUpdate = async (p) => {
    setSendingUpdateReq(p.id)
    let items = []
    try { items = p.checklist ? JSON.parse(p.checklist) : [] } catch {}
    const missing = items.filter(i => !i.checked).map(i => i.label)
    const result = await sendReminder(parseInt(id), {
      month: p.month,
      year:  p.year,
      missing_items: missing.length ? missing : undefined,
    }).catch(err => ({ error: err.response?.data?.detail || 'Failed' }))

    if (result.type === 'mailto') window.open(result.link, '_blank')
    setSendingUpdateReq(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!student) return <div className="p-8 text-slate-500">Student not found.</div>

  const pct = student.total_hours_required > 0
    ? Math.min(100, Math.round((student.total_hours_completed / student.total_hours_required) * 100))
    : 0

  const chartData = [...student.progress].reverse().slice(-12).map(p => ({
    name: `${MONTHS_SHORT[p.month - 1]} ${p.year}`,
    hours: p.hours_completed,
    status: p.submission_status,
  }))

  const internDates = [student.internship_start, student.internship_end]
    .filter(Boolean)
    .map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
    .join(' → ')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back to Students
        </Link>
        <a
          href={reportUrl(id)}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
          title="Download PDF report"
        >
          <FileDown size={15} /> Download Report
        </a>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT — profile */}
        <div className="space-y-5">
          {/* Profile card */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">{student.name}</h1>
                  <StatusBadge status={student.status} />
                </div>
              </div>
              <Link to={`/students/${id}/edit`} className="btn-ghost p-1.5 rounded-lg">
                <Edit2 size={15} />
              </Link>
            </div>
            <div className="space-y-3">
              <InfoRow icon={Mail}     label="Email"      value={student.email}      href={`mailto:${student.email}`} />
              <InfoRow icon={Phone}    label="Phone"      value={student.phone} />
              <InfoRow icon={BookOpen} label="University" value={student.university} />
              <InfoRow icon={BookOpen} label="Program"    value={student.program} />
              <InfoRow icon={Building2}label="Cohort"     value={student.cohort} />
              {student.linkedin && (
                <InfoRow icon={Linkedin} label="LinkedIn" value={student.linkedin} href={student.linkedin} />
              )}
            </div>
          </div>

          {/* Internship */}
          <div className="card">
            <p className="section-title flex items-center gap-2">
              <Building2 size={15} className="text-slate-400" /> Internship
            </p>
            <div className="space-y-3">
              <InfoRow icon={Building2} label="Company"  value={student.internship_company} />
              <InfoRow icon={BookOpen}  label="Position" value={student.internship_position} />
              {internDates && <InfoRow icon={Calendar} label="Duration" value={internDates} />}
            </div>
          </div>

          {/* Hours */}
          <div className="card">
            <p className="section-title flex items-center gap-2">
              <Clock size={15} className="text-slate-400" /> Hours Progress
            </p>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500">Completed</span>
              <span className="font-bold text-slate-800">
                {student.total_hours_completed}h / {student.total_hours_required}h
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-right text-sm font-semibold mt-1.5 text-slate-600">{pct}%</p>
          </div>

          {/* Reminder */}
          <div className="card">
            <p className="section-title flex items-center gap-2">
              <Send size={15} className="text-slate-400" /> Reminder
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Send a general monthly update reminder to this student.
            </p>
            <button
              onClick={handleSendReminder}
              disabled={sendingReminder || !student.email}
              className="btn-primary w-full justify-center"
            >
              <Send size={14} />
              {sendingReminder ? 'Sending...' : 'Send Reminder'}
            </button>
            {!student.email && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> No email address on file
              </p>
            )}
            {reminderStatus && (
              <div className={`mt-3 flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                reminderStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                reminderStatus.type === 'error'   ? 'bg-red-50 text-red-600' :
                'bg-blue-50 text-blue-700'
              }`}>
                {reminderStatus.type === 'success'
                  ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
                {reminderStatus.msg}
              </div>
            )}
          </div>

          {student.notes && (
            <div className="card">
              <p className="section-title flex items-center gap-2">
                <FileText size={15} className="text-slate-400" /> Notes
              </p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{student.notes}</p>
            </div>
          )}
        </div>

        {/* RIGHT — tabs */}
        <div className="col-span-2 space-y-5">
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {[
              { key: 'progress',  label: 'Monthly Progress', icon: TrendingUp },
              { key: 'documents', label: 'Documents',        icon: FileText },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === t.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* Progress tab */}
          {activeTab === 'progress' && (
            <div className="space-y-5">
              {/* Chart */}
              {chartData.length > 0 && (
                <div className="card">
                  <p className="section-title">Hours per Month</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={
                            entry.status === 'submitted' ? '#3b82f6' :
                            entry.status === 'late'      ? '#f87171' : '#94a3b8'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 justify-end">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"/> Submitted</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"/> Late</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block"/> Pending</span>
                  </div>
                </div>
              )}

              {/* Progress log */}
              <div className="card">
                <div className="flex items-center justify-between mb-5">
                  <p className="section-title mb-0">Monthly Log</p>
                  <button
                    className="btn-primary"
                    onClick={() => { setEditingProgress(null); setShowProgressModal(true) }}
                  >
                    <Plus size={14} /> Add Month
                  </button>
                </div>

                {student.progress.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No progress entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {student.progress.map(p => {
                      let clItems = []
                      try { clItems = p.checklist ? JSON.parse(p.checklist) : [] } catch {}
                      const unchecked = clItems.filter(i => !i.checked)
                      const allDone = clItems.length > 0 && unchecked.length === 0

                      return (
                        <div key={p.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Header row */}
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-slate-800 text-sm">
                                  {MONTHS_SHORT[p.month - 1]} {p.year}
                                </span>
                                <StatusBadge status={p.submission_status} size="xs" />
                                <span className="text-sm font-bold text-blue-600">{p.hours_completed}h</span>
                                {clItems.length > 0 && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    allDone
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {allDone ? 'All done' : `${unchecked.length} pending`}
                                  </span>
                                )}
                              </div>

                              {p.tasks_completed && (
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-medium text-slate-600">Tasks: </span>
                                  {p.tasks_completed}
                                </p>
                              )}
                              {p.challenges && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  <span className="font-medium text-slate-600">Challenges: </span>
                                  {p.challenges}
                                </p>
                              )}
                              {p.goals_next_month && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  <span className="font-medium text-slate-600">Next goals: </span>
                                  {p.goals_next_month}
                                </p>
                              )}

                              {/* Checklist */}
                              <ChecklistDisplay checklistJson={p.checklist} />

                              {/* Request update for this month */}
                              {!allDone && clItems.length > 0 && student.email && (
                                <button
                                  onClick={() => handleRequestMonthUpdate(p)}
                                  disabled={sendingUpdateReq === p.id}
                                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <MailOpen size={12} />
                                  {sendingUpdateReq === p.id
                                    ? 'Sending…'
                                    : `Request ${MONTHS_LONG[p.month-1]} update`}
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditingProgress(p); setShowProgressModal(true) }}
                                className="btn-ghost p-1.5 rounded-lg text-slate-400"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProgress(p.id)}
                                className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents tab */}
          {activeTab === 'documents' && (
            <div className="card">
              <p className="section-title flex items-center gap-2 mb-5">
                <FileText size={15} className="text-slate-400" /> Documents & Files
              </p>
              <DocumentsSection
                studentId={parseInt(id)}
                documents={student.documents}
                onRefresh={load}
              />
            </div>
          )}
        </div>
      </div>

      {/* Progress modal */}
      {showProgressModal && (
        <MonthlyProgressModal
          studentId={parseInt(id)}
          existing={editingProgress}
          onClose={() => { setShowProgressModal(false); setEditingProgress(null) }}
          onSaved={() => { setShowProgressModal(false); setEditingProgress(null); load() }}
        />
      )}
    </div>
  )
}
