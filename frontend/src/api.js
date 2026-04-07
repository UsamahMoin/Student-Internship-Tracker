import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getStats = () => api.get('/stats').then(r => r.data)

export const listStudents = (params = {}) => api.get('/students', { params }).then(r => r.data)
export const createStudent = (data) => api.post('/students', data).then(r => r.data)
export const getStudent = (id) => api.get(`/students/${id}`).then(r => r.data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then(r => r.data)
export const deleteStudent = (id) => api.delete(`/students/${id}`).then(r => r.data)

export const upsertProgress = (studentId, data) =>
  api.post(`/students/${studentId}/progress`, data).then(r => r.data)
export const deleteProgress = (progressId) =>
  api.delete(`/progress/${progressId}`).then(r => r.data)

export const uploadDocument = (studentId, docType, file) => {
  const form = new FormData()
  form.append('doc_type', docType)
  form.append('file', file)
  return api.post(`/students/${studentId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const deleteDocument = (docId) => api.delete(`/documents/${docId}`).then(r => r.data)
export const downloadUrl = (docId) => `/api/documents/${docId}/download`
export const reportUrl   = (studentId) => `/api/students/${studentId}/report`

export const sendReminder = (studentId, body = {}) =>
  api.post(`/students/${studentId}/send-reminder`, body).then(r => r.data)

export const getEmailConfig  = () => api.get('/config/email').then(r => r.data)
export const saveEmailConfig = (data) => api.post('/config/email', data).then(r => r.data)
