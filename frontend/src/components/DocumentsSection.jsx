import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, Download, FileCheck } from 'lucide-react'
import { uploadDocument, deleteDocument, downloadUrl } from '../api'

const DOC_TYPES = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'resume', label: 'Resume' },
  { value: 'other', label: 'Other' },
]

const TYPE_LABELS = {
  offer_letter: 'Offer Letter',
  resume: 'Resume',
  other: 'Other',
}

const TYPE_COLORS = {
  offer_letter: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  resume: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  other: 'bg-slate-100 text-slate-600',
}

function FileIcon({ filename }) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  if (['pdf'].includes(ext)) return <FileCheck size={18} className="text-red-500" />
  if (['doc', 'docx'].includes(ext)) return <FileText size={18} className="text-blue-500" />
  return <FileText size={18} className="text-slate-400" />
}

export default function DocumentsSection({ studentId, documents, onRefresh }) {
  const [docType, setDocType] = useState('offer_letter')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadDocument(studentId, docType, file)
      onRefresh()
      fileRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return
    try {
      await deleteDocument(docId)
      onRefresh()
    } catch {
      alert('Failed to delete')
    }
  }

  const grouped = DOC_TYPES.reduce((acc, { value }) => {
    acc[value] = documents.filter(d => d.doc_type === value)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Upload bar */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
        <select
          className="input w-40 flex-shrink-0"
          value={docType}
          onChange={e => setDocType(e.target.value)}
        >
          {DOC_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className={`btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
          <Upload size={14} />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        <span className="text-xs text-slate-400">PDF, DOC, DOCX, JPG, PNG</span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Document groups */}
      {DOC_TYPES.map(({ value, label }) => {
        const docs = grouped[value]
        if (!docs.length) return null
        return (
          <div key={value}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-2">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition"
                >
                  <FileIcon filename={doc.filename} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.filename}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[doc.doc_type]}`}>
                    {TYPE_LABELS[doc.doc_type]}
                  </span>
                  <a
                    href={downloadUrl(doc.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost p-1.5 rounded-lg text-slate-500"
                    title="Download"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {documents.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <FileText size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      )}
    </div>
  )
}
