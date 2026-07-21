import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { validateStudentInput } from "../utils/studentValidation.js";

const EMPTY = { name: "", rollNo: "", className: "", section: "", guardianName: "", guardianPhone: "" };

// Used for both add (student=null) and edit (student passed in).
export default function StudentForm({ open, onClose, onSubmit, student, submitting, serverErrors }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(
        student
          ? {
              name: student.name || "",
              rollNo: student.rollNo || "",
              className: student.className || "",
              section: student.section || "",
              guardianName: student.guardianName || "",
              guardianPhone: student.guardianPhone || ""
            }
          : EMPTY
      );
      setErrors({});
    }
  }, [open, student]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { valid, errors: fieldErrors } = validateStudentInput(form);
    setErrors(fieldErrors);
    if (!valid) return;
    onSubmit(form);
  }

  const allErrors = { ...errors, ...(serverErrors || {}) };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? "Edit student" : "Add student"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="student-form"
            disabled={submitting}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? "Saving…" : student ? "Save changes" : "Add student"}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Full name" error={allErrors.name}>
          <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Roll no." error={allErrors.rollNo}>
            <input style={inputStyle} value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} />
          </Field>
          <Field label="Class" error={allErrors.className}>
            <input style={inputStyle} value={form.className} onChange={(e) => set("className", e.target.value)} />
          </Field>
          <Field label="Section" error={allErrors.section}>
            <input style={inputStyle} value={form.section} onChange={(e) => set("section", e.target.value)} />
          </Field>
        </div>

        <Field label="Guardian name">
          <input style={inputStyle} value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
        </Field>
        <Field label="Guardian phone" error={allErrors.guardianPhone}>
          <input style={inputStyle} value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} />
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
