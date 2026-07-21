import { useState } from "react";
import { useApi } from "../hooks/useApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { useToast } from "./Toast.jsx";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "admin", label: "Admins" },
  { value: "teacher", label: "Teachers" },
  { value: "accountant", label: "Accountants" }
];

// Phase 13 — Dashboard announcements banner + admin composer. Everyone
// sees announcements addressed to their role (or "all"); only admins get
// the form to post new ones.
export default function AnnouncementsPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, refetch } = useApi("/announcements");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState(["all"]);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";
  const announcements = data?.announcements || [];

  function toggleAudience(value) {
    setAudience((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/announcements", {
        title: title.trim(),
        body: body.trim(),
        audience: audience.length > 0 ? audience : ["all"]
      });
      setTitle("");
      setBody("");
      setAudience(["all"]);
      setOpen(false);
      toast.success("Announcement posted");
      refetch();
    } catch (err) {
      toast.error(err.message || "Couldn't post announcement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.del(`/announcements/${id}`);
      toast.success("Announcement removed");
      refetch();
    } catch (err) {
      toast.error(err.message || "Couldn't remove announcement");
    }
  }

  if (!loading && announcements.length === 0 && !isAdmin) return null;

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius)",
        padding: 20,
        marginBottom: 24
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 className="display" style={{ margin: 0, fontSize: 15 }}>
          Announcements
        </h3>
        {isAdmin && (
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 12.5
            }}
          >
            {open ? "Cancel" : "New announcement"}
          </button>
        )}
      </div>

      {open && isAdmin && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 13.5
            }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            rows={3}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 13.5,
              resize: "vertical"
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-dim)" }}>
            {AUDIENCE_OPTIONS.map((opt) => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={audience.includes(opt.value)}
                  onChange={() => toggleAudience(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            style={{
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? "Posting…" : "Post announcement"}
          </button>
        </form>
      )}

      {loading && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Loading…</p>}

      {!loading && announcements.length === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No announcements right now.</p>
      )}

      {!loading && announcements.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {announcements.map((a) => (
            <li key={a.id} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 13.5 }}>{a.title}</strong>
                <span style={{ fontSize: 11.5, color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                  {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {a.author?.name ? ` · ${a.author.name}` : ""}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-dim)" }}>{a.body}</p>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(a.id)}
                  style={{
                    marginTop: 6,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: "var(--danger)",
                    fontSize: 11.5,
                    cursor: "pointer"
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
