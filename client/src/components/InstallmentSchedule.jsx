// Renders one fee plan's progress bar + installment list. `onPay` and
// `onViewReceipt` are passed down so the parent page owns the actual API
// calls (and can show toasts / refetch).
export default function InstallmentSchedule({ feePlan, onPay, onViewReceipt, payingId, canManage }) {
  const total = Number(feePlan.totalAmount);
  const paidAmount = feePlan.installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const pct = total > 0 ? Math.round((paidAmount / total) * 100) : 0;

  return (
    <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          ₹{total.toLocaleString("en-IN")} total &middot; {feePlan.installmentCount} installments
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
          ₹{paidAmount.toLocaleString("en-IN")} collected ({pct}%)
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", transition: "width 0.3s" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {feePlan.installments.map((inst, idx) => (
          <div
            key={inst.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 12px",
              borderRadius: 10,
              background: "var(--panel-2)",
              fontSize: 13
            }}
          >
            <span style={{ width: 20, color: "var(--text-faint)", fontSize: 12 }}>#{idx + 1}</span>
            <span style={{ flex: 1 }}>₹{Number(inst.amount).toLocaleString("en-IN")}</span>
            <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
              Due {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <StatusBadge status={inst.status} />
            {inst.status === "paid" ? (
              <button onClick={() => onViewReceipt(inst)} style={actionBtn}>
                Receipt
              </button>
            ) : canManage ? (
              <button
                onClick={() => onPay(inst)}
                disabled={payingId === inst.id}
                style={{ ...actionBtn, background: "var(--accent)", color: "var(--accent-ink)", border: "none", fontWeight: 600 }}
              >
                {payingId === inst.id ? "Saving…" : "Mark paid"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    paid: { color: "var(--sync-live)", label: "Paid" },
    pending: { color: "var(--text-faint)", label: "Pending" },
    overdue: { color: "var(--danger)", label: "Overdue" }
  }[status];

  return (
    <span
      style={{
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${config.color}`,
        color: config.color,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap"
      }}
    >
      {config.label}
    </span>
  );
}

const actionBtn = {
  padding: "6px 11px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 12
};
