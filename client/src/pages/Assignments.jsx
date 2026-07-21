import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";

const STATUS_OPTIONS = ["pending", "submitted", "late"];

export default function Assignments() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === "admin" || user?.role === "teacher";

  const [assignments, setAssignments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/assignments");
      setAssignments(data.assignments);
    } catch (err) {
      toast.error(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (canEdit) {
      api
        .get("/staff?status=active")
        .then((data) => setStaffList(data.staff))
        .catch(() => setStaffList([]));
    }
  }, [canEdit]);

  async function openDetail(assignment) {
    setSelected(assignment);
    setDetail(null);
    try {
      const data = await api.get(`/assignments/${assignment.id}`);
      setDetail(data.assignment);
    } catch (err) {
      toast.error(err.message || "Couldn't load submissions");
    }
  }

  async function handleCreate(form) {
    try {
      await api.post("/assignments", form);
      toast.success("Assignment created");
      setFormOpen(false);
      loadAssignments();
    } catch (err) {
      toast.error(err.message || "Couldn't create assignment");
    }
  }

  async function handleStatusChange(studentId, status) {
    try {
      await api.post(`/assignments/${selected.id}/submissions`, { studentId, status });
      const data = await api.get(`/assignments/${selected.id}`);
      setDetail(data.assignment);
    } catch (err) {
      toast.error(err.message || "Couldn't update submission");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 className="display" style={{ margin: "0 0 4px" }}>
            Assignments
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: 0 }}>
            {assignments.length} assignment{assignments.length === 1 ? "" : "s"}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setFormOpen(true)} style={primaryBtn}>
            + New assignment
          </button>
        )}
      </div>

      <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", marginBottom: 20 }}>
        <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--panel-2)" }}>
              <th style={headCell}>Title</th>
              <th style={headCell}>Class</th>
              <th style={headCell}>Subject</th>
              <th style={headCell}>Due</th>
              <th style={headCell}>Teacher</th>
            </tr>
          </thead>
          <tbody>
            {!loading && assignments.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...bodyCell, textAlign: "center", color: "var(--text-faint)" }}>
                  No assignments yet.
                </td>
              </tr>
            )}
            {assignments.map((a) => (
              <tr key={a.id} onClick={() => openDetail(a)} style={{ cursor: "pointer", background: selected?.id === a.id ? "var(--panel-2)" : "transparent" }}>
                <td style={{ ...bodyCell, fontWeight: 600 }}>{a.title}</td>
                <td style={bodyCell}>{a.className}</td>
                <td style={bodyCell}>{a.subject}</td>
                <td style={bodyCell}>{new Date(a.dueDate).toLocaleDateString()}</td>
                <td style={bodyCell}>{a.staff?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && detail && (
        <div>
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
            {detail.title} — submissions
          </h3>
          <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
            <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "var(--panel-2)" }}>
                  <th style={headCell}>Student</th>
                  <th style={headCell}>Status</th>
                  {canEdit && <th style={headCell} />}
                </tr>
              </thead>
              <tbody>
                {detail.submissions.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ ...bodyCell, textAlign: "center", color: "var(--text-faint)" }}>
                      No students in this class yet.
                    </td>
                  </tr>
                )}
                {detail.submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={bodyCell}>
                      {sub.student.name} <span style={{ color: "var(--text-faint)" }}>({sub.student.rollNo})</span>
                    </td>
                    <td style={bodyCell}>
                      <StatusPill status={sub.status} />
                    </td>
                    {canEdit && (
                      <td style={{ ...bodyCell, textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          {STATUS_OPTIONS.filter((s) => s !== sub.status).map((s) => (
                            <button key={s} onClick={() => handleStatusChange(sub.student.id, s)} style={rowActionBtn}>
                              Mark {s}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canEdit && (
        <AssignmentForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} staffList={staffList} />
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const color = status === "submitted" ? "var(--sync-live)" : status === "late" ? "var(--danger)" : "var(--text-faint)";
  return <span style={{ color, fontWeight: 600, textTransform: "capitalize" }}>{status}</span>;
}

function AssignmentForm({ open, onClose, onSubmit, staffList }) {
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [staffId, setStaffId] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setClassName("");
      setSubject("");
      setTitle("");
      setDueDate("");
      setStaffId("");
      setErrors({});
    }
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = {};
    if (!className.trim()) fieldErrors.className = "Class is required";
    if (!subject.trim()) fieldErrors.subject = "Subject is required";
    if (!title.trim()) fieldErrors.title = "Title is required";
    if (!dueDate) fieldErrors.dueDate = "Due date is required";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    onSubmit({ className: className.trim(), subject: subject.trim(), title: title.trim(), dueDate, staffId: staffId || undefined });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New assignment"
      footer={
        <>
          <button type="button" onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button type="submit" form="assignment-form" style={primaryBtn}>
            Create
          </button>
        </>
      }
    >
      <form id="assignment-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Title" error={errors.title}>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Class" error={errors.className}>
            <input style={inputStyle} value={className} onChange={(e) => setClassName(e.target.value)} />
          </Field>
          <Field label="Subject" error={errors.subject}>
            <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        </div>
        <Field label="Due date" error={errors.dueDate}>
          <input type="date" style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Teacher">
          <select style={inputStyle} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.subject})
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
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

const rowActionBtn = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 12
};
