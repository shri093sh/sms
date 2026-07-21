import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useToast } from "../components/Toast.jsx";

function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Payroll() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonthStr());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/payroll?${new URLSearchParams({ month })}`);
      setRecords(data.records);
    } catch (err) {
      setError(err.message || "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await api.post("/payroll/generate", { month });
      toast.success(data.created ? `Generated ${data.created} record(s)` : "Already up to date");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't generate payroll");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRowSave(record, baseSalary, deductions) {
    try {
      await api.put(`/payroll/${record.id}`, { baseSalary, deductions });
      toast.success("Saved");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't save");
    }
  }

  async function handleMarkPaid(record) {
    try {
      await api.post(`/payroll/${record.id}/pay`, {});
      toast.success(`Marked ${record.staff.name} as paid`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't mark paid");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 className="display" style={{ margin: "0 0 4px" }}>
            Payroll
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: 0 }}>
            {records.length} record{records.length === 1 ? "" : "s"} for {month}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={filterInput} />
          <button onClick={handleGenerate} disabled={generating} style={primaryBtn}>
            {generating ? "Generating…" : "Generate for month"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--panel-2)" }}>
              <th style={headCell}>Staff</th>
              <th style={headCell}>Base salary</th>
              <th style={headCell}>Deductions</th>
              <th style={headCell}>Net pay</th>
              <th style={headCell}>Status</th>
              <th style={headCell} />
            </tr>
          </thead>
          <tbody>
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...bodyCell, textAlign: "center", color: "var(--text-faint)" }}>
                  No records for this month yet — click "Generate for month".
                </td>
              </tr>
            )}
            {records.map((r) => (
              <PayrollRow key={r.id} record={r} onSave={handleRowSave} onMarkPaid={handleMarkPaid} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayrollRow({ record, onSave, onMarkPaid }) {
  const [base, setBase] = useState(String(record.baseSalary));
  const [deductions, setDeductions] = useState(String(record.deductions));

  useEffect(() => {
    setBase(String(record.baseSalary));
    setDeductions(String(record.deductions));
  }, [record.baseSalary, record.deductions]);

  const dirty = Number(base) !== Number(record.baseSalary) || Number(deductions) !== Number(record.deductions);
  const netPay = (Number(base) || 0) - (Number(deductions) || 0);
  const paid = !!record.paidOn;

  return (
    <tr>
      <td style={bodyCell}>
        <div style={{ fontWeight: 600 }}>{record.staff.name}</div>
        <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{record.staff.subject}</div>
      </td>
      <td style={bodyCell}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={base}
          disabled={paid}
          onChange={(e) => setBase(e.target.value)}
          style={{ ...inputStyle, width: 110 }}
        />
      </td>
      <td style={bodyCell}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={deductions}
          disabled={paid}
          onChange={(e) => setDeductions(e.target.value)}
          style={{ ...inputStyle, width: 110 }}
        />
      </td>
      <td style={{ ...bodyCell, fontWeight: 600 }}>{netPay.toFixed(2)}</td>
      <td style={bodyCell}>
        {paid ? (
          <span style={{ color: "var(--sync-live)" }}>Paid {new Date(record.paidOn).toLocaleDateString()}</span>
        ) : (
          <span style={{ color: "var(--text-faint)" }}>Unpaid</span>
        )}
      </td>
      <td style={{ ...bodyCell, textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 8 }}>
          {!paid && dirty && (
            <button onClick={() => onSave(record, Number(base), Number(deductions))} style={rowActionBtn}>
              Save
            </button>
          )}
          {!paid && (
            <button onClick={() => onMarkPaid(record)} style={{ ...rowActionBtn, color: "var(--accent-ink)", background: "var(--accent)" }}>
              Mark paid
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const filterInput = {
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--panel)",
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

const inputStyle = {
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  outline: "none"
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
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 12.5
};
