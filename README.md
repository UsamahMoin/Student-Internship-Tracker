# Student Internship Tracker

A clean, full-stack web app for managing Computer Science internship students — track monthly progress, hours, documents, and send email reminders, all from one place.

Built with **React + FastAPI + SQLite**. Runs entirely on your local machine; no cloud services required.

---

## Features

| Feature | Details |
|---|---|
| **Student Profiles** | Name, student ID, email, cohort (semester + year), LinkedIn, status, notes |
| **Internship Details** | Company, position, start/end dates, required hours |
| **Monthly Progress Log** | Hours per month, tasks, challenges, next goals, submission status |
| **Monthly Checklist** | 5 built-in checklist items per month — check them off as they arrive |
| **Hours Tracking** | Visual progress bar per student (completed vs. required) |
| **Document Storage** | Upload and download offer letters, resumes, and other files (PDF, DOCX, JPG) |
| **PDF Reports** | One-click report generation per student — full profile, hours bar, progress table |
| **Email Reminders** | Send monthly update reminders via SMTP or fallback mailto link |
| **Clickable Dashboard** | Stats cards open filtered student lists; hours view sortable asc/desc |
| **Portable Data** | All data lives in `data/` — copy it to any machine to migrate |

---

## Screenshots

> Dashboard — clickable stat cards with slide-out student panels

![Dashboard](https://raw.githubusercontent.com/UsamahMoin/Student-Internship-Tracker/main/screenshots/dashboard.png)

> Student Profile — progress log, checklist, documents, PDF export

![Student Detail](https://raw.githubusercontent.com/UsamahMoin/Student-Internship-Tracker/main/screenshots/student_detail.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| Backend | Python 3, FastAPI, Uvicorn |
| Database | SQLite (single file, zero setup) |
| PDF Generation | fpdf2 |
| File Storage | Local filesystem under `data/uploads/` |

---

## Getting Started

### Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/) *(only needed to rebuild the frontend)*

### 1. Clone the repo

```bash
git clone https://github.com/UsamahMoin/Student-Internship-Tracker.git
cd Student-Internship-Tracker
```

### 2. Install Python dependencies

```bash
pip install fastapi uvicorn[standard] python-multipart pydantic fpdf2
```

### 3. Build the frontend *(first time only)*

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Run the app

**Mac** — double-click `launch.command` in Finder, or:
```bash
python3 launch.py
```

**Windows** — double-click `launch.bat`, or:
```bash
python launch.py
```

The launcher builds the frontend if needed, starts the server, and opens your browser automatically at **http://localhost:8000**.

---

## Running in Development Mode

If you want live-reload on both frontend and backend simultaneously:

**Terminal 1 — Backend:**
```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (Vite dev server):**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173**.

---

## Data Portability

All student data is stored in the `data/` folder at the project root:

```
data/
  students.db       ← SQLite database (all student records)
  uploads/
    {student_id}/   ← uploaded files per student
```

**To move your data to another computer:** copy the entire `data/` folder to the same location on the new machine and run the app as normal.

The `data/` folder is excluded from git and will never be committed.

---

## Email Reminders

Go to **Settings** in the sidebar to configure SMTP:

| Field | Example |
|---|---|
| SMTP Host | `smtp.gmail.com` |
| SMTP Port | `587` |
| Email | `you@gmail.com` |
| Password | Your Gmail App Password |
| Sender Name | `Student Coordinator` |

> For Gmail: generate an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2FA enabled).

If SMTP is not configured, clicking **Send Reminder** opens your default email client with a pre-filled message instead.

---

## Project Structure

```
Student-Internship-Tracker/
├── backend/
│   ├── main.py              # FastAPI app — all API routes + PDF generation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Students, StudentDetail, StudentForm, Settings
│   │   ├── components/      # Layout, StatusBadge, MonthlyProgressModal, DocumentsSection
│   │   ├── api.js           # Axios API client
│   │   └── index.css        # Tailwind + shared component classes
│   ├── package.json
│   └── vite.config.js
├── data/                    # ← gitignored, stays local
├── launch.py                # Cross-platform launcher (opens browser automatically)
├── launch.command           # Mac double-click launcher
├── launch.bat               # Windows double-click launcher
└── .gitignore
```

---

## API Reference

The backend exposes a REST API at `http://localhost:8000/api`. Interactive docs are available at **http://localhost:8000/docs** when the server is running.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Dashboard statistics |
| GET/POST | `/api/students` | List / create students |
| GET/PUT/DELETE | `/api/students/{id}` | Get / update / delete student |
| POST | `/api/students/{id}/progress` | Add or update monthly progress |
| DELETE | `/api/progress/{id}` | Delete progress entry |
| POST | `/api/students/{id}/documents` | Upload document |
| GET | `/api/documents/{id}/download` | Download document |
| GET | `/api/students/{id}/report` | Generate PDF report |
| POST | `/api/students/{id}/send-reminder` | Send email reminder |
| GET/POST | `/api/config/email` | Get / save SMTP config |
