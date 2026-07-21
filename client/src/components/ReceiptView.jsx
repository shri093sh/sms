import Modal from "./Modal.jsx";

// Simple printable receipt — window.print() with a scoped @media print
// rule is enough here; no PDF generation library needed for Phase 7.
export default function ReceiptView({ open, onClose, installment }) {
  if (!installment) return null;
  const student = installment.feePlan?.student;

  return (
    <Modal open={open} onClose={onClose} title="Fee receipt" width={420}>
      <div id="receipt-print-area" style={{ fontSize: 13.5, color: "var(--text)" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div className="display" style={{ fontSize: 17 }}>
            Prerana SMS
          </div>
          <div style={{ color: "var(--text-faint)", fontSize: 12 }}>Fee payment receipt</div>
        </div>

        <Row label="Student" value={student?.name} />
        <Row label="Class / Section" value={student ? `${student.className} - ${student.section}` : ""} />
        <Row label="Roll No." value={student?.rollNo} />
        <Row label="Amount paid" value={`₹${Number(installment.amount).toLocaleString("en-IN")}`} />
        <Row label="Due date" value={new Date(installment.dueDate).toLocaleDateString("en-IN")} />
        <Row
          label="Paid on"
          value={installment.paidDate ? new Date(installment.paidDate).toLocaleDateString("en-IN") : "—"}
        />
        <Row label="Receipt ref." value={installment.id.slice(-8).toUpperCase()} />
      </div>

      <button
        onClick={() => window.print()}
        style={{
          marginTop: 18,
          width: "100%",
          padding: "10px 16px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontWeight: 600
        }}
      >
        Print / Save as PDF
      </button>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: fixed; inset: 0; padding: 24px; background: white; color: black; }
        }
      `}</style>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid var(--border-soft)"
      }}
    >
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}
