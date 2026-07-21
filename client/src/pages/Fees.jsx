import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import InstallmentSchedule from "../components/InstallmentSchedule.jsx";
import FeePlanForm from "../components/FeePlanForm.jsx";
import ReceiptView from "../components/ReceiptView.jsx";

export default function Fees() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === "admin" || user?.role === "accountant";

  const [tab, setTab] = useState("student"); // student | overdue

  if (!canManage) {
    return (
      <div>
        <h2 className="display" style={{ margin: "0 0 6px" }}>
          Fees
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Fees & EMI management is available to admin and accountant accounts.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="display" style={{ margin: "0 0 4px" }}>
        Fees
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 18px" }}>
        Fee plans, EMI schedules and payment collection.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <TabButton active={tab === "student"} onClick={() => setTab("student")}>
            By student
          </TabButton>
          <TabButton active={tab === "overdue"} onClick={() => setTab("overdue")}>
            Overdue
          </TabButton>
        </div>
        <ExportButton toast={toast} status={tab === "overdue" ? "overdue" : undefined} />
      </div>

      {tab === "student" ? <StudentFeesTab toast={toast} canManage={canManage} /> : <OverdueTab toast={toast} canManage={canManage} />}
    </div>
  );
}

function ExportButton({ toast, status }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const blob = await api.getBlob(`/installments/export?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fees-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export fees");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        padding: "8px 14px",
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--text-dim)",
        fontSize: 13
      }}
    >
      {exporting ? "Exporting…" : "Export CSV"}
    </button>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--text-dim)",
        fontWeight: active ? 600 : 400,
        fontSize: 13.5
      }}
    >
      {children}
    </button>
  );
}

function StudentFeesTab({ toast, canManage }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feePlans, setFeePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planErrors, setPlanErrors] = useState({});
  const [receiptInstallment, setReceiptInstallment] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const data = await api.get(`/students?q=${encodeURIComponent(query)}&pageSize=6`);
        setResults(data.students);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function loadPlans(student) {
    setSelected(student);
    setQuery("");
    setResults([]);
    setLoadingPlans(true);
    try {
      const data = await api.get(`/students/${student.id}/fee-plans`);
      setFeePlans(data.feePlans);
    } catch (err) {
      toast.error(err.message || "Couldn't load fee plans");
    } finally {
      setLoadingPlans(false);
    }
  }

  async function handleCreatePlan(form) {
    setPlanSubmitting(true);
    setPlanErrors({});
    try {
      await api.post(`/students/${selected.id}/fee-plans`, form);
      toast.success("Fee plan created");
      setPlanFormOpen(false);
      loadPlans(selected);
    } catch (err) {
      setPlanErrors(err.details || {});
      toast.error(err.message || "Couldn't create fee plan");
    } finally {
      setPlanSubmitting(false);
    }
  }

  async function handlePay(installment) {
    setPayingId(installment.id);
    try {
      await api.post(`/installments/${installment.id}/pay`, {});
      toast.success("Installment marked paid");
      loadPlans(selected);
    } catch (err) {
      toast.error(err.message || "Couldn't mark installment paid");
    } finally {
      setPayingId(null);
    }
  }

  async function handleViewReceipt(installment) {
    try {
      const data = await api.get(`/installments/${installment.id}/receipt`);
      setReceiptInstallment(data.installment);
    } catch (err) {
      toast.error(err.message || "Couldn't load receipt");
    }
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 420 }}>
        <input
          placeholder="Search a student to view or set up fees…"
          value={selected ? `${selected.name} (${selected.className}-${selected.section})` : query}
          onChange={(e) => {
            setSelected(null);
            setFeePlans([]);
            setQuery(e.target.value);
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 14,
            outline: "none"
          }}
        />
        {results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "var(--panel)",
              border: "1px solid var(--border-soft)",
              borderRadius: 10,
              overflow: "hidden",
              zIndex: 10
            }}
          >
            {results.map((s) => (
              <div
                key={s.id}
                onClick={() => loadPlans(s)}
                style={{ padding: "10px 14px", fontSize: 13.5, cursor: "pointer", borderBottom: "1px solid var(--border-soft)" }}
              >
                {s.name} <span style={{ color: "var(--text-faint)" }}>· {s.className}-{s.section} · Roll {s.rollNo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selected && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Search for a student above to view their fee plans.</p>}

      {selected && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 className="display" style={{ margin: 0, fontSize: 16 }}>
              {selected.name}
            </h3>
            <button
              onClick={() => {
                setPlanErrors({});
                setPlanFormOpen(true);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 9,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-dim)",
                fontSize: 13
              }}
            >
              + New fee plan
            </button>
          </div>

          {loadingPlans && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>}

          {!loadingPlans && feePlans.length === 0 && (
            <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>No fee plan yet for this student.</p>
          )}

          {!loadingPlans &&
            feePlans.map((plan) => (
              <InstallmentSchedule
                key={plan.id}
                feePlan={plan}
                onPay={handlePay}
                onViewReceipt={handleViewReceipt}
                payingId={payingId}
                canManage={canManage}
              />
            ))}
        </div>
      )}

      <FeePlanForm
        open={planFormOpen}
        onClose={() => setPlanFormOpen(false)}
        onSubmit={handleCreatePlan}
        submitting={planSubmitting}
        serverErrors={planErrors}
      />

      <ReceiptView open={!!receiptInstallment} onClose={() => setReceiptInstallment(null)} installment={receiptInstallment} />
    </div>
  );
}

function OverdueTab({ toast, canManage }) {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/installments?status=overdue");
      setInstallments(data.installments);
    } catch (err) {
      toast.error(err.message || "Couldn't load overdue installments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay(inst) {
    setPayingId(inst.id);
    try {
      await api.post(`/installments/${inst.id}/pay`, {});
      toast.success("Installment marked paid");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't mark installment paid");
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>;

  if (installments.length === 0) {
    return <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>No overdue installments right now.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {installments.map((inst) => (
        <div
          key={inst.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderRadius: 10,
            border: "1px solid var(--border-soft)",
            fontSize: 13.5
          }}
        >
          <span style={{ flex: 1 }}>
            {inst.feePlan.student.name}{" "}
            <span style={{ color: "var(--text-faint)" }}>
              · {inst.feePlan.student.className}-{inst.feePlan.student.section}
            </span>
          </span>
          <span>₹{Number(inst.amount).toLocaleString("en-IN")}</span>
          <span style={{ color: "var(--danger)", fontSize: 12 }}>
            Due {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          {canManage && (
            <button
              onClick={() => handlePay(inst)}
              disabled={payingId === inst.id}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontWeight: 600,
                fontSize: 12
              }}
            >
              {payingId === inst.id ? "Saving…" : "Mark paid"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
