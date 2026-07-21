import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { validateStaffInput } from "../utils/staffValidation.js";

const EMPTY = { name: "", subject: "", phone: "", email: "" };

// Used for both add (staff=null) and edit (staff passed in).
export default function StaffForm({ open, onClose, onSubmit, staff, submitting, serverErrors }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(
        staff
          ? {
              name: staff.name || "",
              subject: staff.subject || "",
              phone: staff.phone || "",
              email: staff.email || ""
            }
          : EMPTY
      );
      setErrors({});
    }
  }, [open, staff]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { valid, errors: fieldErrors } = validateStaffInput(form);
    setErrors(fieldErrors);
    if (!valid) return;
    onSubmit(form);
  }

  const allErrors = { ...errors, ...(serverErrors || {}) };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={staff ? "Edit staff member" : "Add staff member"}
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
            form="staff-form"
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
            {submitting ? "Saving…" : staff ? "Save changes" : "Add staff member"}
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Full name" error={allErrors.name}>
          <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>

        <Field label="Subject" error={allErrors.subject}>
          <input style={inputStyle} value={form.subject} onChange={(e) => set("subject", e.target.value)} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Phone" error={allErrors.phone}>
            <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email" error={allErrors.email}>
            <input style={inputStyle} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
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
