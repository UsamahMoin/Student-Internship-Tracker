import { useState } from 'react'
import { X, Download, CheckSquare, Square, FileSpreadsheet } from 'lucide-react'

const COLUMNS = [
  { key: 'name',                  label: 'Full Name',        group: 'Personal', default: true },
  { key: 'student_id',            label: 'Student ID',       group: 'Personal', default: true },
  { key: 'email',                 label: 'Email',            group: 'Personal', default: true },
  { key: 'status',                label: 'Status',           group: 'Personal', default: true },
  { key: 'cohort',                label: 'Cohort',           group: 'Personal', default: true },
  { key: 'internship_company',    label: 'Company',          group: 'Internship', default: true },
  { key: 'internship_position',   label: 'Position',         group: 'Internship', default: false },
  { key: 'internship_start',      label: 'Start Date',       group: 'Internship', default: false },
  { key: 'internship_end',        label: 'End Date',         group: 'Internship', default: false },
  { key: 'total_hours_required',  label: 'Hours Required',   group: 'Hours',    default: false },
  { key: 'total_hours_completed', label: 'Hours Completed',  group: 'Hours',    default: true },
  { key: 'linkedin',              label: 'LinkedIn',         group: 'Personal', default: false },
  { key: 'notes',                 label: 'Notes',            group: 'Personal', default: false },
]

const SEMESTERS = ['Fall', 'Spring', 'Summer']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)

const GROUPS = ['Personal', 'Internship', 'Hours']

export default function ExportModal({ onClose }) {
  const [selected, setSelected]     = useState(() => new Set(COLUMNS.filter(c => c.default).map(c => c.key)))
  const [semesters, setSemesters]   = useState(new Set())   // empty = all
  const [year, setYear]             = useState('')           // empty = all years
  const [generating, setGenerating] = useState(false)

  const toggleCol = (key) =>
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  const toggleSemester = (sem) =>
    setSemesters(s => { const n = new Set(s); n.has(sem) ? n.delete(sem) : n.add(sem); return n })

  const selectAll   = () => setSelected(new Set(COLUMNS.map(c => c.key)))
  const selectNone  = () => setSelected(new Set())
  const selectGroup = (group) => {
    const keys = COLUMNS.filter(c => c.group === group).map(c => c.key)
    setSelected(s => { const n = new Set(s); keys.forEach(k => n.add(k)); return n })
  }

  const handleExport = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    try {
      const params = new URLSearchParams()
      params.set('columns', [...selected].join(','))
      if (semesters.size === 1) params.set('semester', [...semesters][0])
      if (year) params.set('year', year)

      const res = await fetch(`/api/students/export?${params}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      // Use filename from Content-Disposition if available
      const cd   = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="([^"]+)"/)
      a.download = match ? match[1] : 'students_export.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-800">Export to Excel</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Filters */}
          <div>
            <p className="label mb-3">Filter Students</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Semester */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Semester</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSemesters(new Set())}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition ${
                      semesters.size === 0
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${semesters.size === 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`} />
                    All semesters
                  </button>
                  {SEMESTERS.map(sem => (
                    <button
                      key={sem}
                      onClick={() => toggleSemester(sem)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition ${
                        semesters.has(sem)
                          ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {semesters.has(sem)
                        ? <CheckSquare size={13} className="text-blue-600 flex-shrink-0" />
                        : <Square size={13} className="text-slate-300 flex-shrink-0" />}
                      {sem}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Year</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setYear('')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition ${
                      !year
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${!year ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`} />
                    All years
                  </button>
                  {YEARS.map(y => (
                    <button
                      key={y}
                      onClick={() => setYear(year === String(y) ? '' : String(y))}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition ${
                        year === String(y)
                          ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {year === String(y)
                        ? <CheckSquare size={13} className="text-blue-600 flex-shrink-0" />
                        : <Square size={13} className="text-slate-300 flex-shrink-0" />}
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Column picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="label mb-0">Columns to include <span className="text-slate-400 font-normal">({selected.size} selected)</span></p>
              <div className="flex gap-2">
                <button onClick={selectAll}  className="text-xs text-blue-600 hover:underline">All</button>
                <span className="text-slate-300">·</span>
                <button onClick={selectNone} className="text-xs text-slate-500 hover:underline">None</button>
              </div>
            </div>

            {GROUPS.map(group => {
              const groupCols = COLUMNS.filter(c => c.group === group)
              const allGroupSelected = groupCols.every(c => selected.has(c.key))
              return (
                <div key={group} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{group}</p>
                    <button
                      onClick={() => selectGroup(group)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Select all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {groupCols.map(col => (
                      <button
                        key={col.key}
                        onClick={() => toggleCol(col.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition text-left ${
                          selected.has(col.key)
                            ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium'
                            : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {selected.has(col.key)
                          ? <CheckSquare size={13} className="text-blue-600 flex-shrink-0" />
                          : <Square size={13} className="text-slate-300 flex-shrink-0" />}
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {semesters.size > 0 || year
              ? `Filtered: ${[...semesters].join(', ') || 'All semesters'} · ${year || 'All years'}`
              : 'All students'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={handleExport}
              disabled={generating || selected.size === 0}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700"
            >
              <Download size={14} />
              {generating ? 'Generating...' : 'Download Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
