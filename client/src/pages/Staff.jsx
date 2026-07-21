import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import DataGrid from "../components/DataGrid.jsx";
import StaffForm from "../components/StaffForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const COLUMNS = [
  { key: "name", label: "Name", sortable: true },
  { key: "subject", label: "Subject", sortable: true },
  { key: "phone", label: "Phone", render: (row) => row.phone || "—" },
  { key: "email", label: "Email", render: (row) => row.email || "—" }
];

export default function Staff() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sort, setSort] = useState("name");
  const [dir, setDir] = useState("asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [confirmTarget, setConfirmTarget] = useState(null); // staff to archive/restore

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, dir, status: statusFilter });
      if (q) params.set("q", q);

      const data = await api.get(`/staff?${params.toString()}`);
      setRows(data.staff);
    } catch (err) {
      setError(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [sort, dir, statusFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search input so we don't fire a request per keystroke.
  const [qInput, setQInput] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput), 350);
    return () => clearTimeout(id);
  }, [qInput]);

  function handleSort(key) {
    if (sort === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir("asc");
    }
  }

  function openAdd() {
    setEditingStaff(null);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(staff) {
    setEditingStaff(staff);
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleFormSubmit(form) {
    setSubmitting(true);
    setFormErrors({});
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, form);
        toast.success("Staff member updated");
      } else {
        await api.post("/staff", form);
        toast.success("Staff member added");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormErrors(err.details || {});
      toast.error(err.message || "Couldn't save staff member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!confirmTarget) return;
    const action = confirmTarget.status === "archived" ? "restore" : "archive";
    try {
      await api.post(`/staff/${confirmTarget.id}/${action}`, {});
      toast.success(action === "archive" ? "Staff member archived" : "Staff member restored");
      load();
    } catch (err) {
      toast.error(err.message || "Action failed");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 className="display" style={{ margin: "0 0 4px" }}>
            Staff
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: 0 }}>
            {rows.length} {statusFilter === "archived" ? "archived" : "active"} staff member{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontWeight: 600,
              fontSize: 13.5
            }}
          >
            + Add staff member
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          placeholder="Search name, subject, phone, email…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          style={{ ...filterInput, flex: "1 1 220px" }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...filterInput, width: 130 }}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <DataGrid
        columns={COLUMNS}
        rows={rows}
        rowKey="id"
        sort={sort}
        dir={dir}
        onSort={handleSort}
        loading={loading}
        emptyMessage="No staff match your filters."
        actions={
          canEdit
            ? (row) => (
                <div style={{ display: "inline-flex", gap: 8 }}>
                  <button onClick={() => openEdit(row)} style={rowActionBtn}>
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmTarget(row)}
                    style={{ ...rowActionBtn, color: row.status === "archived" ? "var(--sync-live)" : "var(--danger)" }}
                  >
                    {row.status === "archived" ? "Restore" : "Archive"}
                  </button>
                </div>
              )
            : undefined
        }
      />

      <StaffForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        staff={editingStaff}
        submitting={submitting}
        serverErrors={formErrors}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleArchiveConfirm}
        title={confirmTarget?.status === "archived" ? "Restore staff member?" : "Archive staff member?"}
        message={
          confirmTarget?.status === "archived"
            ? `${confirmTarget?.name} will reappear in the active staff list.`
            : `${confirmTarget?.name} will be hidden from the active staff list. Timetable and payroll history is kept, and you can restore them anytime.`
        }
        confirmLabel={confirmTarget?.status === "archived" ? "Restore" : "Archive"}
        danger={confirmTarget?.status !== "archived"}
      />
    </div>
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

const rowActionBtn = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 12.5
};
