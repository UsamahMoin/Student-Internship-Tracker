const CONFIG = {
  active:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' },
  completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' },
  future:    { label: 'Future',    cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' },
  submitted: { label: 'Submitted', cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' },
  late:      { label: 'Late',      cls: 'bg-red-100 text-red-700 ring-1 ring-red-200' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = CONFIG[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  const textSize = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${textSize} ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
