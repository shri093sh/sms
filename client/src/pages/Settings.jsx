import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const inputStyle = {
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--panel)",
  color: "var(--text)",
  fontSize: 13.5
};

const btnPrimary = {
  padding: "9px 16px",
  borderRadius: 9,
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontWeight: 600,
  fontSize: 13.5
};

const btnGhost = {
  padding: "8px 14px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 13
};

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("org");

  return (
    <div>
      <h2 className="display" style={{ margin: "0 0 4px" }}>
        Settings
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 18px" }}>
        Organization profile, staff accounts and automated backups.
      </p>

      {isAdmin && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          <TabButton active={tab === "org"} onClick={() => setTab("org")}>
            Organization
          </TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>
            Users
          </TabButton>
          <TabButton active={tab === "backups"} onClick={() => setTab("backups")}>
            Backups
          </TabButton>
          <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>
            Audit log
          </TabButton>
        </div>
      )}

      {!isAdmin && (
        <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Organization settings, user management and backups are available to admin accounts only.
        </p>
      )}

      {isAdmin && tab === "org" && <OrgTab toast={toast} />}
      {isAdmin && tab === "users" && <UsersTab toast={toast} currentUser={user} />}
      {isAdmin && tab === "backups" && <BackupsTab toast={toast} />}
      {isAdmin && tab === "audit" && <AuditLogTab toast={toast} />}
    </div>
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

function OrgTab({ toast }) {
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupTime, setBackupTime] = useState("02:00");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api
      .get("/settings")
      .then((data) => {
        setOrgName(data.settings.orgName || "");
        setOrgLogoUrl(data.settings.orgLogoUrl || "");
        setBackupEnabled(data.settings.backupEnabled);
        setBackupTime(data.settings.backupTime);
      })
      .catch((err) => toast.error(err.message || "Couldn't load settings"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setErrors({});
    try {
      await api.put("/settings", { orgName, orgLogoUrl: orgLogoUrl || null, backupEnabled, backupTime });
      toast.success("Settings saved");
    } catch (err) {
      setErrors(err.details || {});
      toast.error(err.message || "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Organization name" error={errors.orgName}>
        <input value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
      </Field>

      <Field label="Logo URL (optional)">
        <input
          value={orgLogoUrl}
          onChange={(e) => setOrgLogoUrl(e.target.value)}
          placeholder="https://…"
          style={{ ...inputStyle, width: "100%" }}
        />
      </Field>

      <div style={{ height: 1, background: "var(--border-soft)", margin: "6px 0" }} />

      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--text)" }}>
        <input type="checkbox" checked={backupEnabled} onChange={(e) => setBackupEnabled(e.target.checked)} />
        Enable automated daily backups
      </label>

      <Field label="Backup time (24h, server clock)" error={errors.backupTime}>
        <input
          type="time"
          value={backupTime}
          onChange={(e) => setBackupTime(e.target.value)}
          disabled={!backupEnabled}
          style={{ ...inputStyle, opacity: backupEnabled ? 1 : 0.5 }}
        />
      </Field>

      <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, alignSelf: "flex-start", marginTop: 6 }}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const ROLE_OPTIONS = ["admin", "teacher", "accountant"];

function UsersTab({ toast, currentUser }) {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, action: "deactivate" | "activate" }
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/users");
      setUsers(data.users);
    } catch (err) {
      toast.error(err.message || "Couldn't load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRoleChange(u, role) {
    setBusyId(u.id);
    try {
      await api.put(`/users/${u.id}`, { role });
      toast.success(`${u.name}'s role updated`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(u) {
    setBusyId(u.id);
    try {
      await api.post(`/users/${u.id}/${u.isActive ? "deactivate" : "activate"}`, {});
      toast.success(u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update account");
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button onClick={() => setAddOpen(true)} style={btnGhost}>
          + Add user
        </button>
      </div>

      {loading && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>}

      {!loading && users && (
        <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {users.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderBottom: i === users.length - 1 ? "none" : "1px solid var(--border-soft)",
                opacity: u.isActive ? 1 : 0.55
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5 }}>
                  {u.name} {u.id === currentUser.id && <span style={{ color: "var(--text-faint)" }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{u.email}</div>
              </div>

              {!u.isActive && (
                <span style={{ fontSize: 11, color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: 6, padding: "2px 6px" }}>
                  Deactivated
                </span>
              )}

              <select
                value={u.role}
                disabled={busyId === u.id || u.id === currentUser.id}
                onChange={(e) => handleRoleChange(u, e.target.value)}
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12.5 }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {u.id !== currentUser.id && (
                <button
                  onClick={() => (u.isActive ? setConfirmTarget(u) : handleToggleActive(u))}
                  disabled={busyId === u.id}
                  style={{ ...btnGhost, fontSize: 12, padding: "6px 12px" }}
                >
                  {u.isActive ? "Deactivate" : "Reactivate"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} toast={toast} />

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && handleToggleActive(confirmTarget)}
        title="Deactivate account?"
        message={confirmTarget ? `${confirmTarget.name} won't be able to log in until reactivated.` : ""}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}

function AddUserModal({ open, onClose, onCreated, toast }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("teacher");
    setErrors({});
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});
    try {
      await api.post("/auth/register", { name, email, password, role });
      toast.success(`Account created for ${name}`);
      reset();
      onClose();
      onCreated();
    } catch (err) {
      setErrors(err.details || {});
      toast.error(err.message || "Couldn't create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a user"
      footer={
        <button onClick={handleSubmit} disabled={submitting} style={btnPrimary}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name" error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </Field>
        <Field label="Temporary password (min 8 characters)" error={errors.password}>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </Field>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>
          No email is sent — share this password with them directly and ask them to change it after first login.
        </p>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function BackupsTab({ toast }) {
  const [backups, setBackups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/backups");
      setBackups(data.backups);
    } catch (err) {
      toast.error(err.message || "Couldn't load backups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRunNow() {
    setRunning(true);
    try {
      await api.post("/backups/run", {});
      toast.success("Backup completed");
      load();
    } catch (err) {
      toast.error(err.message || "Backup failed");
      load();
    } finally {
      setRunning(false);
    }
  }

  async function handleDownload(b) {
    setDownloadingId(b.id);
    try {
      const blob = await api.getBlob(`/backups/${b.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = b.fileUrl || "backup.sql";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't download backup");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 13.5, maxWidth: 420 }}>
          Automated backups run on the schedule set in the Organization tab. You can also trigger one manually here.
        </p>
        <button onClick={handleRunNow} disabled={running} style={btnPrimary}>
          {running ? "Running…" : "Run backup now"}
        </button>
      </div>

      {loading && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>}

      {!loading && backups && backups.length === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>No backups yet.</p>
      )}

      {!loading && backups && backups.length > 0 && (
        <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {backups.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderBottom: i === backups.length - 1 ? "none" : "1px solid var(--border-soft)",
                fontSize: 13.5
              }}
            >
              <span style={{ flex: 1 }}>
                {new Date(b.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "capitalize",
                  color: b.status === "success" ? "var(--sync-live, #2ecc71)" : "var(--danger)",
                  border: `1px solid ${b.status === "success" ? "var(--sync-live, #2ecc71)" : "var(--danger)"}`,
                  borderRadius: 6,
                  padding: "2px 8px"
                }}
              >
                {b.status}
              </span>
              {b.status === "success" && (
                <button onClick={() => handleDownload(b)} disabled={downloadingId === b.id} style={{ ...btnGhost, fontSize: 12, padding: "6px 12px" }}>
                  {downloadingId === b.id ? "Preparing…" : "Download"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ENTITY_TYPE_OPTIONS = ["Student", "Staff", "Installment"];

function AuditLogTab({ toast }) {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (entityType) params.set("entityType", entityType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await api.get(`/audit-log?${params.toString()}`);
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.message || "Couldn't load audit log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entityType, from, to]);

  function handleFilterChange(setter) {
    return (e) => {
      setPage(1);
      setter(e.target.value);
    };
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={entityType} onChange={handleFilterChange(setEntityType)} style={{ ...inputStyle, width: 150 }}>
          <option value="">All entities</option>
          {ENTITY_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={handleFilterChange(setFrom)} style={{ ...inputStyle, width: 150 }} />
        <span style={{ alignSelf: "center", color: "var(--text-faint)", fontSize: 12.5 }}>to</span>
        <input type="date" value={to} onChange={handleFilterChange(setTo)} style={{ ...inputStyle, width: 150 }} />
      </div>

      {loading && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>}

      {!loading && entries && entries.length === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>No matching activity.</p>
      )}

      {!loading && entries && entries.length > 0 && (
        <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderBottom: i === entries.length - 1 ? "none" : "1px solid var(--border-soft)",
                fontSize: 13
              }}
            >
              <span style={{ width: 140, color: "var(--text-faint)", fontSize: 12 }}>
                {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={{ width: 130, color: "var(--text-dim)" }}>{e.user ? e.user.name : "System"}</span>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "capitalize",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "2px 8px"
                }}
              >
                {e.action}
              </span>
              <span style={{ flex: 1 }}>
                {e.entityType} <span style={{ color: "var(--text-faint)" }}>· {e.entityId}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
          Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...btnGhost, opacity: page <= 1 ? 0.5 : 1 }}>
            Previous
          </button>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ ...btnGhost, opacity: page >= pagination.totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
