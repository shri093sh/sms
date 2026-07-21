import { useState } from "react";
import Modal from "./Modal.jsx";

export default function FeePlanForm({ open, onClose, onSubmit, submitting, serverErrors }) {
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("4");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ totalAmount, installmentCount, startDate });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New fee plan"
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
            form="fee-plan-form"
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
            {submitting ? "Creating…" : "Create plan"}
          </button>
        </>
      }
    >
      <form id="fee-plan-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Total amount (₹)" error={serverErrors?.totalAmount}>
          <input
            type="number"
            min="1"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Number of installments" error={serverErrors?.installmentCount}>
          <input
            type="number"
            min="1"
            max="24"
            value={installmentCount}
            onChange={(e) => setInstallmentCount(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="First due date">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </Field>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>
          Installments are spaced one month apart, split evenly (any rounding remainder goes on the last installment).
        </p>
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
