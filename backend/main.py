from fastapi import FastAPI, HTTPException, UploadFile, File, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, smtplib, uuid, urllib.parse, json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

app = FastAPI(title="Student Tracker API")
router = APIRouter()

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, '..', 'data')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
DB_PATH   = os.path.join(DATA_DIR, 'students.db')
DIST_DIR  = os.path.join(BASE_DIR, '..', 'frontend', 'dist')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_CHECKLIST = [
    {"id": "hours",      "label": "Hours submitted",                   "checked": False},
    {"id": "tasks",      "label": "Tasks / projects documented",        "checked": False},
    {"id": "supervisor", "label": "Supervisor feedback received",       "checked": False},
    {"id": "goals",      "label": "Goals for next month defined",       "checked": False},
    {"id": "attendance", "label": "Attendance / timesheet confirmed",   "checked": False},
]


# ── DB ─────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_id TEXT,
        email TEXT,
        phone TEXT,
        university TEXT,
        program TEXT,
        cohort TEXT,
        status TEXT DEFAULT 'active',
        internship_company TEXT,
        internship_position TEXT,
        internship_start TEXT,
        internship_end TEXT,
        total_hours_required INTEGER DEFAULT 480,
        linkedin TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS monthly_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        hours_completed REAL DEFAULT 0,
        tasks_completed TEXT,
        challenges TEXT,
        goals_next_month TEXT,
        submission_status TEXT DEFAULT 'pending',
        submitted_at TEXT,
        checklist TEXT,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(student_id, month, year)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        doc_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS email_config (
        id INTEGER PRIMARY KEY,
        smtp_host TEXT,
        smtp_port INTEGER DEFAULT 587,
        smtp_user TEXT,
        smtp_password TEXT,
        sender_name TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    # migrations for existing DBs
    for col, definition in [("checklist", "TEXT")]:
        try:
            c.execute(f"ALTER TABLE monthly_progress ADD COLUMN {col} {definition}")
        except Exception:
            pass

    for col, definition in [("student_id", "TEXT")]:
        try:
            c.execute(f"ALTER TABLE students ADD COLUMN {col} {definition}")
        except Exception:
            pass

    conn.commit()
    conn.close()


init_db()


# ── Models ──────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str
    student_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    university: Optional[str] = None
    program: Optional[str] = None
    cohort: Optional[str] = None
    status: str = "active"
    internship_company: Optional[str] = None
    internship_position: Optional[str] = None
    internship_start: Optional[str] = None
    internship_end: Optional[str] = None
    total_hours_required: int = 480
    linkedin: Optional[str] = None
    notes: Optional[str] = None


class ProgressCreate(BaseModel):
    month: int
    year: int
    hours_completed: float = 0
    tasks_completed: Optional[str] = None
    challenges: Optional[str] = None
    goals_next_month: Optional[str] = None
    submission_status: str = "pending"
    checklist: Optional[str] = None   # JSON string


class EmailConfigCreate(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    sender_name: str = "Student Coordinator"


class ReminderRequest(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    missing_items: Optional[list] = None   # list of checklist label strings


# ── Helpers ─────────────────────────────────────────────────────────────────

def _send_email(cfg: dict, to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg["From"] = f"{cfg['sender_name']} <{cfg['smtp_user']}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"]) as server:
        server.starttls()
        server.login(cfg["smtp_user"], cfg["smtp_password"])
        server.send_message(msg)


MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
MONTHS_LONG  = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']


# ── PDF Report ───────────────────────────────────────────────────────────────

def _generate_report_pdf(student: dict) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    lm = pdf.l_margin
    W  = pdf.w - pdf.l_margin - pdf.r_margin

    # ── Header bar ────
    pdf.set_fill_color(37, 99, 235)
    pdf.rect(0, 0, pdf.w, 38, 'F')
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(lm, 10)
    pdf.cell(W, 10, "Student Progress Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(W, 7, f"Generated: {datetime.now().strftime('%B %d, %Y')}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(30, 41, 59)
    pdf.ln(10)

    # ── Student name + status ───
    pdf.set_font("Helvetica", "B", 17)
    pdf.cell(W, 10, student["name"], new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(W, 6, f"Status: {student.get('status','').title()}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(30, 41, 59)
    pdf.ln(4)

    def section_header(title: str):
        pdf.ln(3)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(W, 8, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    def info_row(label: str, value):
        if not value:
            return
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(50, 6, label, new_x="END", new_y="TOP")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(W - 50, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    # ── Personal info ───
    section_header("Personal Information")
    info_row("Email",       student.get("email"))
    info_row("Phone",       student.get("phone"))
    info_row("University",  student.get("university"))
    info_row("Program",     student.get("program"))
    info_row("Cohort",      student.get("cohort"))
    if student.get("linkedin"):
        info_row("LinkedIn", student["linkedin"])

    # ── Internship ───
    section_header("Internship Details")
    info_row("Company",    student.get("internship_company"))
    info_row("Position",   student.get("internship_position"))
    info_row("Start Date", student.get("internship_start"))
    info_row("End Date",   student.get("internship_end"))

    # ── Hours ───
    section_header("Hours Progress")
    completed = student.get("total_hours_completed", 0) or 0
    required  = student.get("total_hours_required", 480) or 480
    pct = min(100, round(completed / required * 100)) if required else 0
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(W, 6, f"{completed}h completed / {required}h required  ({pct}%)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    bar_y = pdf.get_y()
    bar_x = lm
    filled_w = round(W * pct / 100)
    pdf.set_fill_color(226, 232, 240)
    pdf.rect(bar_x, bar_y, W, 6, "F")
    if filled_w > 0:
        pdf.set_fill_color(37, 99, 235)
        pdf.rect(bar_x, bar_y, filled_w, 6, "F")
    pdf.ln(10)

    # ── Monthly progress table ───
    progress = student.get("progress", [])
    if progress:
        section_header("Monthly Progress Log")
        col = [32, 18, 28, W - 78]
        headers = ["Month", "Hours", "Status", "Tasks Completed"]
        pdf.set_fill_color(37, 99, 235)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 9)
        for w, h in zip(col, headers):
            pdf.cell(w, 7, h, fill=True, border=0, new_x="END", new_y="TOP")
        pdf.ln(7)
        pdf.set_text_color(30, 41, 59)
        for i, p in enumerate(progress):
            if i % 2 == 0:
                pdf.set_fill_color(248, 250, 252)
            else:
                pdf.set_fill_color(241, 245, 249)
            f = True
            m_label = f"{MONTHS_SHORT[p['month']-1]} {p['year']}"
            tasks   = (p.get("tasks_completed") or "")[:45]
            if len(tasks) == 45:
                tasks += "..."
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(col[0], 7, m_label,                           fill=f, new_x="END", new_y="TOP")
            pdf.cell(col[1], 7, f"{p['hours_completed']}h",         fill=f, new_x="END", new_y="TOP")
            pdf.cell(col[2], 7, (p.get("submission_status") or "").title(), fill=f, new_x="END", new_y="TOP")
            pdf.cell(col[3], 7, tasks,                              fill=f, new_x="LMARGIN", new_y="NEXT")

            # checklist (ASCII-safe only — Helvetica doesn't support Unicode symbols)
            cl = json.loads(p["checklist"]) if p.get("checklist") else []
            if cl:
                pdf.set_font("Helvetica", "", 7.5)
                pdf.set_text_color(100, 116, 139)
                items_text = "   " + "  |  ".join(
                    f"[{'OK' if item['checked'] else '  '}] {item['label']}" for item in cl
                )
                pdf.multi_cell(W, 5, items_text, new_x="LMARGIN", new_y="NEXT")
                pdf.set_text_color(30, 41, 59)

    # ── Notes ───
    if student.get("notes"):
        section_header("Notes")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(W, 6, student["notes"], new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM students");                             total     = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM students WHERE status='active'");       active    = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM students WHERE status='completed'");    completed = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM students WHERE status='future'");       future    = c.fetchone()[0]
    c.execute("SELECT COALESCE(SUM(hours_completed),0) FROM monthly_progress"); hrs = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM monthly_progress WHERE submission_status='pending'"); pending = c.fetchone()[0]
    conn.close()
    return {
        "total_students": total, "active_students": active,
        "completed_students": completed, "future_students": future,
        "total_hours_logged": hrs, "pending_submissions": pending,
    }


@router.get("/students")
def list_students(status: Optional[str] = None, search: Optional[str] = None, pending: Optional[bool] = None):
    conn = get_db()
    c = conn.cursor()
    query = "SELECT * FROM students WHERE 1=1"
    params = []
    if status:
        query += " AND status=?"; params.append(status)
    if search:
        query += " AND (name LIKE ? OR email LIKE ? OR internship_company LIKE ? OR university LIKE ?)"
        params.extend([f"%{search}%"] * 4)
    if pending:
        query += " AND id IN (SELECT DISTINCT student_id FROM monthly_progress WHERE submission_status='pending')"
    query += " ORDER BY name ASC"
    c.execute(query, params)
    students = [dict(r) for r in c.fetchall()]
    for s in students:
        c.execute("SELECT COALESCE(SUM(hours_completed),0) FROM monthly_progress WHERE student_id=?", (s["id"],))
        s["total_hours_completed"] = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM documents WHERE student_id=?", (s["id"],))
        s["document_count"] = c.fetchone()[0]
    conn.close()
    return students


@router.post("/students")
def create_student(student: StudentCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """INSERT INTO students (name,student_id,email,phone,university,program,cohort,status,
           internship_company,internship_position,internship_start,internship_end,
           total_hours_required,linkedin,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (student.name, student.student_id, student.email, student.phone, student.university, student.program,
         student.cohort, student.status, student.internship_company, student.internship_position,
         student.internship_start, student.internship_end, student.total_hours_required,
         student.linkedin, student.notes),
    )
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"id": new_id, "message": "Student created"}


@router.get("/students/{student_id}")
def get_student(student_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM students WHERE id=?", (student_id,))
    row = c.fetchone()
    if not row:
        conn.close(); raise HTTPException(404, "Student not found")
    student = dict(row)
    c.execute("SELECT COALESCE(SUM(hours_completed),0) FROM monthly_progress WHERE student_id=?", (student_id,))
    student["total_hours_completed"] = c.fetchone()[0]
    c.execute("SELECT * FROM monthly_progress WHERE student_id=? ORDER BY year DESC, month DESC", (student_id,))
    student["progress"] = [dict(r) for r in c.fetchall()]
    c.execute("SELECT * FROM documents WHERE student_id=? ORDER BY uploaded_at DESC", (student_id,))
    student["documents"] = [dict(r) for r in c.fetchall()]
    conn.close()
    return student


@router.put("/students/{student_id}")
def update_student(student_id: int, student: StudentCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """UPDATE students SET name=?,student_id=?,email=?,phone=?,university=?,program=?,cohort=?,status=?,
           internship_company=?,internship_position=?,internship_start=?,internship_end=?,
           total_hours_required=?,linkedin=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?""",
        (student.name, student.student_id, student.email, student.phone, student.university, student.program,
         student.cohort, student.status, student.internship_company, student.internship_position,
         student.internship_start, student.internship_end, student.total_hours_required,
         student.linkedin, student.notes, student_id),
    )
    conn.commit(); conn.close()
    return {"message": "Student updated"}


@router.delete("/students/{student_id}")
def delete_student(student_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT filepath FROM documents WHERE student_id=?", (student_id,))
    for row in c.fetchall():
        if os.path.exists(row[0]): os.remove(row[0])
    c.execute("DELETE FROM students WHERE id=?", (student_id,))
    conn.commit(); conn.close()
    return {"message": "Student deleted"}


@router.post("/students/{student_id}/progress")
def upsert_progress(student_id: int, progress: ProgressCreate):
    conn = get_db()
    c = conn.cursor()
    submitted_at = datetime.now().isoformat() if progress.submission_status == "submitted" else None
    checklist_json = progress.checklist or json.dumps(DEFAULT_CHECKLIST)
    c.execute(
        """INSERT INTO monthly_progress
           (student_id,month,year,hours_completed,tasks_completed,challenges,goals_next_month,
            submission_status,submitted_at,checklist)
           VALUES (?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(student_id,month,year) DO UPDATE SET
             hours_completed=excluded.hours_completed,
             tasks_completed=excluded.tasks_completed,
             challenges=excluded.challenges,
             goals_next_month=excluded.goals_next_month,
             submission_status=excluded.submission_status,
             submitted_at=CASE WHEN excluded.submission_status='submitted' THEN excluded.submitted_at ELSE submitted_at END,
             checklist=excluded.checklist""",
        (student_id, progress.month, progress.year, progress.hours_completed,
         progress.tasks_completed, progress.challenges, progress.goals_next_month,
         progress.submission_status, submitted_at, checklist_json),
    )
    conn.commit(); conn.close()
    return {"message": "Progress saved"}


@router.delete("/progress/{progress_id}")
def delete_progress(progress_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM monthly_progress WHERE id=?", (progress_id,))
    conn.commit(); conn.close()
    return {"message": "Progress deleted"}


@router.post("/students/{student_id}/documents")
async def upload_document(student_id: int, doc_type: str = Form(...), file: UploadFile = File(...)):
    allowed = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(400, "Allowed file types: PDF, DOC, DOCX, JPG, PNG")
    student_dir = os.path.join(UPLOAD_DIR, str(student_id))
    os.makedirs(student_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(student_dir, unique_name)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO documents (student_id,doc_type,filename,filepath) VALUES (?,?,?,?)",
              (student_id, doc_type, file.filename, filepath))
    conn.commit()
    doc_id = c.lastrowid
    conn.close()
    return {"id": doc_id, "filename": file.filename, "message": "Uploaded"}


@router.get("/documents/{doc_id}/download")
def download_document(doc_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM documents WHERE id=?", (doc_id,))
    doc = c.fetchone()
    conn.close()
    if not doc: raise HTTPException(404, "Document not found")
    if not os.path.exists(doc["filepath"]): raise HTTPException(404, "File missing")
    return FileResponse(doc["filepath"], filename=doc["filename"])


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM documents WHERE id=?", (doc_id,))
    doc = c.fetchone()
    if not doc:
        conn.close(); raise HTTPException(404, "Document not found")
    if os.path.exists(doc["filepath"]): os.remove(doc["filepath"])
    c.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    conn.commit(); conn.close()
    return {"message": "Document deleted"}


@router.get("/students/{student_id}/report")
def generate_report(student_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM students WHERE id=?", (student_id,))
    row = c.fetchone()
    if not row:
        conn.close(); raise HTTPException(404, "Student not found")
    student = dict(row)
    c.execute("SELECT COALESCE(SUM(hours_completed),0) FROM monthly_progress WHERE student_id=?", (student_id,))
    student["total_hours_completed"] = c.fetchone()[0]
    c.execute("SELECT * FROM monthly_progress WHERE student_id=? ORDER BY year ASC, month ASC", (student_id,))
    student["progress"] = [dict(r) for r in c.fetchall()]
    conn.close()
    pdf_bytes = _generate_report_pdf(student)
    safe_name = student["name"].replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{safe_name}.pdf"'},
    )


@router.post("/config/email")
def save_email_config(config: EmailConfigCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """INSERT OR REPLACE INTO email_config
           (id,smtp_host,smtp_port,smtp_user,smtp_password,sender_name,updated_at)
           VALUES (1,?,?,?,?,?,CURRENT_TIMESTAMP)""",
        (config.smtp_host, config.smtp_port, config.smtp_user, config.smtp_password, config.sender_name),
    )
    conn.commit(); conn.close()
    return {"message": "Email config saved"}


@router.get("/config/email")
def get_email_config():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT smtp_host,smtp_port,smtp_user,sender_name FROM email_config WHERE id=1")
    row = c.fetchone()
    conn.close()
    return dict(row) if row else {}


@router.post("/students/{student_id}/send-reminder")
def send_reminder(student_id: int, body: Optional[ReminderRequest] = None):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM students WHERE id=?", (student_id,))
    row = c.fetchone()
    if not row:
        conn.close(); raise HTTPException(404, "Student not found")
    student = dict(row)
    c.execute("SELECT * FROM email_config WHERE id=1")
    cfg_row = c.fetchone()
    conn.close()

    if not student.get("email"):
        raise HTTPException(400, "Student has no email address")

    now = datetime.now()
    req_month = body.month if body and body.month else now.month
    req_year  = body.year  if body and body.year  else now.year
    month_str = f"{MONTHS_LONG[req_month - 1]} {req_year}"
    missing   = body.missing_items if body and body.missing_items else []

    subject = f"Monthly Progress Update Request – {month_str}"

    lines = [
        f"Dear {student['name']},",
        "",
        f"This is a friendly reminder to submit your monthly progress update for {month_str}.",
        "",
    ]
    if missing:
        lines += ["The following items are still outstanding:", ""]
        for item in missing:
            lines.append(f"  • {item}")
        lines.append("")
    else:
        lines += [
            "Please include:",
            "  • Hours completed this month",
            "  • Tasks and projects completed",
            "  • Challenges faced",
            "  • Goals for next month",
            "",
        ]
    if student.get("internship_company"):
        lines.append(f"Thank you for your continued hard work at {student['internship_company']}!")
    else:
        lines.append("Thank you for your continued hard work!")
    lines += ["", "Best regards"]
    email_body = "\n".join(lines)

    if not cfg_row:
        mailto = (
            f"mailto:{student['email']}?"
            f"subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(email_body)}"
        )
        return {"type": "mailto", "link": mailto}

    cfg = dict(cfg_row)
    try:
        _send_email(cfg, student["email"], subject, email_body)
        return {"type": "sent", "message": f"Reminder sent to {student['email']}"}
    except Exception as e:
        raise HTTPException(500, f"Email send failed: {e}")


# ── Register router + serve SPA ─────────────────────────────────────────────

app.include_router(router, prefix="/api")

if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
