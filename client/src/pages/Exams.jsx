import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";

export default function Exams() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === "admin" || user?.role === "teacher";

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/exams");
      setExams(data.exams);
    } catch (err) {
      toast.error(err.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  async function handleCreate(form) {
    try {
      await api.post("/exams", form);
      toast.success("Exam created");
      setFormOpen(false);
      loadExams();
    } catch (err) {
      toast.error(err.message || "Couldn't create exam");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 className="display" style={{ margin: "0 0 4px" }}>
            Exams &amp; Grades
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: 0 }}>
            {exams.length} exam{exams.length === 1 ? "" : "s"}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setFormOpen(true)} style={primaryBtn}>
            + New exam
          </button>
        )}
      </div>

      <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", marginBottom: 20 }}>
        <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--panel-2)" }}>
              <th style={headCell}>Name</th>
              <th style={headCell}>Class</th>
              <th style={headCell}>Date</th>
            </tr>
          </thead>
          <tbody>
            {!loading && exams.length === 0 && (
              <tr>
                <td colSpan={3} style={{ ...bodyCell, textAlign: "center", color: "var(--text-faint)" }}>
                  No exams yet.
                </td>
              </tr>
            )}
            {exams.map((e) => (
              <tr
                key={e.id}
                onClick={() => setSelectedExam(e)}
                style={{ cursor: "pointer", background: selectedExam?.id === e.id ? "var(--panel-2)" : "transparent" }}
              >
                <td style={{ ...bodyCell, fontWeight: 600 }}>{e.name}</td>
                <td style={bodyCell}>{e.className}</td>
                <td style={bodyCell}>{new Date(e.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedExam && <GradeEntry exam={selectedExam} canEdit={canEdit} toast={toast} />}

      <ReportCardLookup toast={toast} />

      {canEdit && <ExamForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />}
    </div>
  );
}

function ExamForm({ open, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setName("");
      setClassName("");
      setDate("");
      setErrors({});
    }
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = {};
    if (!name.trim()) fieldErrors.name = "Name is required";
    if (!className.trim()) fieldErrors.className = "Class is required";
    if (!date) fieldErrors.date = "Date is required";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    onSubmit({ name: name.trim(), className: className.trim(), date });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New exam"
      footer={
        <>
          <button type="button" onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button type="submit" form="exam-form" style={primaryBtn}>
            Create
          </button>
        </>
      }
    >
      <form id="exam-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Exam name" error={errors.name}>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Class" error={errors.className}>
          <input style={inputStyle} value={className} onChange={(e) => setClassName(e.target.value)} />
        </Field>
        <Field label="Date" error={errors.date}>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function GradeEntry({ exam, canEdit, toast }) {
  const [subject, setSubject] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [roster, setRoster] = useState([]);
  const [marksByStudent, setMarksByStudent] = useState({});
  const [existingGrades, setExistingGrades] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubject("");
    setMaxMarks("100");
    setMarksByStudent({});
    api
      .get(`/students?className=${encodeURIComponent(exam.className)}&status=active&pageSize=100`)
      .then((data) => setRoster(data.students))
      .catch(() => setRoster([]));
    api
      .get(`/exams/${exam.id}`)
      .then((data) => setExistingGrades(data.exam.grades))
      .catch(() => setExistingGrades([]));
  }, [exam]);

  async function handleSave() {
    if (!subject.trim()) {
      toast.error("Enter a subject first");
      return;
    }
    const rows = roster
      .filter((s) => marksByStudent[s.id] !== undefined && marksByStudent[s.id] !== "")
      .map((s) => ({ studentId: s.id, subject: subject.trim(), marks: Number(marksByStudent[s.id]), maxMarks: Number(maxMarks) }));
    if (!rows.length) {
      toast.error("Enter at least one mark");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/exams/${exam.id}/grades`, { grades: rows });
      toast.success(`Saved ${rows.length} grade(s)`);
      const data = await api.get(`/exams/${exam.id}`);
      setExistingGrades(data.exam.grades);
    } catch (err) {
      toast.error(err.message || "Couldn't save grades");
    } finally {
      setSaving(false);
    }
  }

  const subjectsEntered = [...new Set(existingGrades.map((g) => g.subject))];

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
        {exam.name} — {exam.className}
      </h3>

      {canEdit && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, width: 180 }} />
            <input
              type="number"
              placeholder="Max marks"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              style={{ ...inputStyle, width: 120 }}
            />
            <button onClick={handleSave} disabled={saving} style={primaryBtn}>
              {saving ? "Saving…" : "Save grades"}
            </button>
          </div>

          <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", marginBottom: 16 }}>
            <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "var(--panel-2)" }}>
                  <th style={headCell}>Student</th>
                  <th style={headCell}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td style={bodyCell}>
                      {s.name} <span style={{ color: "var(--text-faint)" }}>({s.rollNo})</span>
                    </td>
                    <td style={bodyCell}>
                      <input
                        type="number"
                        value={marksByStudent[s.id] ?? ""}
                        onChange={(e) => setMarksByStudent((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        style={{ ...inputStyle, width: 90 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subjectsEntered.length > 0 && (
        <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
          <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--panel-2)" }}>
                <th style={headCell}>Student</th>
                {subjectsEntered.map((subj) => (
                  <th key={subj} style={headCell}>
                    {subj}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id}>
                  <td style={bodyCell}>{s.name}</td>
                  {subjectsEntered.map((subj) => {
                    const g = existingGrades.find((g) => g.studentId === s.id && g.subject === subj);
                    return (
                      <td key={subj} style={bodyCell}>
                        {g ? `${g.marks}/${g.maxMarks}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportCardLookup({ toast }) {
  const [rollQuery, setRollQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!rollQuery) {
      setStudents([]);
      return;
    }
    const id = setTimeout(() => {
      api
        .get(`/students?q=${encodeURIComponent(rollQuery)}&pageSize=8`)
        .then((data) => setStudents(data.students))
        .catch(() => setStudents([]));
    }, 300);
    return () => clearTimeout(id);
  }, [rollQuery]);

  async function loadReport(student) {
    setSelected(student);
    setReport(null);
    try {
      const data = await api.get(`/students/${student.id}/report-card`);
      setReport(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load report card");
    }
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Student report card</h3>
      <input
        placeholder="Search student by name or roll no…"
        value={rollQuery}
        onChange={(e) => setRollQuery(e.target.value)}
        style={{ ...inputStyle, width: 280, marginBottom: 10 }}
      />
      {students.length > 0 && !selected && (
        <div style={{ marginBottom: 12 }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => loadReport(s)}
              style={{ ...secondaryBtn, marginRight: 8, marginBottom: 8 }}
            >
              {s.name} ({s.rollNo})
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <strong>{selected.name}</strong>
            <button onClick={() => { setSelected(null); setReport(null); setRollQuery(""); }} style={secondaryBtn}>
              Clear
            </button>
          </div>
          {report?.exams?.length ? (
            report.exams.map(({ exam, subjects }) => (
              <div key={exam.id} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {exam.name} · {new Date(exam.date).toLocaleDateString()}
                </div>
                <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
                  <table style={{ width: "100%", minWidth: 320, borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--panel-2)" }}>
                        <th style={headCell}>Subject</th>
                        <th style={headCell}>Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub) => (
                        <tr key={sub.subject}>
                          <td style={bodyCell}>{sub.subject}</td>
                          <td style={bodyCell}>
                            {sub.marks}/{sub.maxMarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No grades recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--text-dim)" }}>
      {label}
      {children}
      {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
    </label>
  );
}

const inputStyle = {
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13.5,
  outline: "none"
};

const primaryBtn = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontWeight: 600,
  fontSize: 13.5
};

const secondaryBtn = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontSize: 13.5
};

const headCell = {
  textAlign: "left",
  padding: "10px 14px",
  color: "var(--text-dim)",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  whiteSpace: "nowrap"
};

const bodyCell = {
  padding: "10px 14px",
  borderTop: "1px solid var(--border-soft)",
  verticalAlign: "middle"
};
