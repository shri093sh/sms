import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import DataGrid from "../components/DataGrid.jsx";
import StudentForm from "../components/StudentForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const COLUMNS = [
  { key: "name", label: "Name", sortable: true },
  { key: "rollNo", label: "Roll No.", sortable: true },
  { key: "className", label: "Class", sortable: true },
  { key: "section", label: "Section", sortable: true },
  { key: "guardianName", label: "Guardian", render: (row) => row.guardianName || "—" },
  { key: "guardianPhone", label: "Phone", render: (row) => row.guardianPhone || "—" }
];

const PAGE_SIZE = 20;

export default function Students() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sort, setSort] = useState("name");
  const [dir, setDir] = useState("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [confirmTarget, setConfirmTarget] = useState(null); // student to archive/restore
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [importErrors, setImportErrors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
        dir,
        status: statusFilter
      });
      if (q) params.set("q", q);
      if (classFilter) params.set("className", classFilter);
      if (sectionFilter) params.set("section", sectionFilter);

      const data = await api.get(`/students?${params.toString()}`);
      setRows(data.students);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [page, sort, dir, statusFilter, q, classFilter, sectionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search input so we don't fire a request per keystroke.
  const [qInput, setQInput] = useState("");
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setQ(qInput);
    }, 350);
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
    setEditingStudent(null);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(student) {
    setEditingStudent(student);
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleFormSubmit(form) {
    setSubmitting(true);
    setFormErrors({});
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, form);
        toast.success("Student updated");
      } else {
        await api.post("/students", form);
        toast.success("Student added");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormErrors(err.details || {});
      toast.error(err.message || "Couldn't save student");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!confirmTarget) return;
    const action = confirmTarget.status === "archived" ? "restore" : "archive";
    try {
      await api.post(`/students/${confirmTarget.id}/${action}`, {});
      toast.success(action === "archive" ? "Student archived" : "Student restored");
      load();
    } catch (err) {
      toast.error(err.message || "Action failed");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (classFilter) params.set("className", classFilter);
      if (sectionFilter) params.set("section", sectionFilter);
      const blob = await api.getBlob(`/students/export?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export students");
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setImporting(true);
    setImportErrors([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await api.postForm("/students/import", form);
      if (data.created > 0) toast.success(`Imported ${data.created} student${data.created === 1 ? "" : "s"}`);
      if (data.skipped > 0) toast.error(`${data.skipped} row${data.skipped === 1 ? "" : "s"} skipped — see details below`);
      if (data.created === 0 && data.skipped === 0) toast.error("No rows found in that file");
      setImportErrors(data.errors || []);
      if (data.created > 0) load();
    } catch (err) {
      toast.error(err.message || "Couldn't import students");
    } finally {
      setImporting(false);
    }
  }

  const columns = COLUMNS;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 className="display" style={{ margin: "0 0 4px" }}>
            Students
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: 0 }}>
            {pagination.total} {statusFilter === "archived" ? "archived" : "active"} student{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExport} disabled={exporting} style={secondaryBtn}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFile}
                style={{ display: "none" }}
              />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing} style={secondaryBtn}>
                {importing ? "Importing…" : "Import CSV"}
              </button>
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
                + Add student
              </button>
            </>
          )}
        </div>
      </div>

      {importErrors.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            fontSize: 12.5,
            color: "var(--text-dim)",
            maxHeight: 160,
            overflowY: "auto"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong style={{ color: "var(--text)" }}>Import row errors</strong>
            <button onClick={() => setImportErrors([])} style={{ ...rowActionBtn, padding: "2px 8px" }}>
              Dismiss
            </button>
          </div>
          {importErrors.map((e, i) => (
            <div key={i}>
              Row {e.row}: {e.message}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          placeholder="Search name, roll no., guardian…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          style={{ ...filterInput, flex: "1 1 220px" }}
        />
        <input
          placeholder="Class"
          value={classFilter}
          onChange={(e) => {
            setPage(1);
            setClassFilter(e.target.value);
          }}
          style={{ ...filterInput, width: 100 }}
        />
        <input
          placeholder="Section"
          value={sectionFilter}
          onChange={(e) => {
            setPage(1);
            setSectionFilter(e.target.value);
          }}
          style={{ ...filterInput, width: 100 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          style={{ ...filterInput, width: 130 }}
        >
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
        columns={columns}
        rows={rows}
        rowKey="id"
        sort={sort}
        dir={dir}
        onSort={handleSort}
        loading={loading}
        emptyMessage="No students match your filters."
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pagerBtn(page <= 1)}>
            Previous
          </button>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={pagerBtn(page >= pagination.totalPages)}
          >
            Next
          </button>
        </div>
      </div>

      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        student={editingStudent}
        submitting={submitting}
        serverErrors={formErrors}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleArchiveConfirm}
        title={confirmTarget?.status === "archived" ? "Restore student?" : "Archive student?"}
        message={
          confirmTarget?.status === "archived"
            ? `${confirmTarget?.name} will reappear in the active roster.`
            : `${confirmTarget?.name} will be hidden from the active roster. Fee and attendance history is kept, and you can restore them anytime.`
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

const secondaryBtn = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontWeight: 600,
  fontSize: 13.5
};

const rowActionBtn = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 12.5
};

function pagerBtn(disabled) {
  return {
    padding: "7px 14px",
    borderRadius: 9,
    border: "1px solid var(--border)",
    background: "transparent",
    color: disabled ? "var(--text-faint)" : "var(--text-dim)",
    fontSize: 13,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1
  };
}
