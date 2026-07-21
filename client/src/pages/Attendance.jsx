import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_OPTIONS = [
  { value: "present", label: "P", color: "var(--sync-live, #2ecc71)" },
  { value: "late", label: "L", color: "var(--warning, #e6b800)" },
  { value: "absent", label: "A", color: "var(--danger, #e5484d)" }
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Attendance() {
  const { user } = useAuth();
  const toast = useToast();
  const canMark = user?.role === "admin" || user?.role === "teacher";
  const [tab, setTab] = useState("mark"); // mark | summary | export
  const [classOptions, setClassOptions] = useState([]);

  useEffect(() => {
    api
      .get("/students/meta/classes")
      .then((data) => setClassOptions(data.classes))
      .catch(() => setClassOptions([]));
  }, []);

  return (
    <div>
      <h2 className="display" style={{ margin: "0 0 4px" }}>
        Attendance
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 18px" }}>
        Daily marking, monthly summaries and CSV export.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <TabButton active={tab === "mark"} onClick={() => setTab("mark")}>
          Mark
        </TabButton>
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </TabButton>
        <TabButton active={tab === "export"} onClick={() => setTab("export")}>
          Export
        </TabButton>
      </div>

      {tab === "mark" && <MarkTab toast={toast} canMark={canMark} classOptions={classOptions} />}
      {tab === "summary" && <SummaryTab toast={toast} />}
      {tab === "export" && <ExportTab toast={toast} classOptions={classOptions} />}
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

function ClassSectionPicker({ classOptions, className, section, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <select
        value={className && section ? `${className}\u241f${section}` : ""}
        onChange={(e) => {
          const [c, s] = e.target.value.split("\u241f");
          onChange(c || "", s || "");
        }}
        style={{
          padding: "9px 12px",
          borderRadius: 9,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          fontSize: 13.5,
          minWidth: 180
        }}
      >
        <option value="">Select class & section…</option>
        {classOptions.map((c) => (
          <option key={`${c.className}-${c.section}`} value={`${c.className}\u241f${c.section}`}>
            {c.className} - {c.section}
          </option>
        ))}
      </select>
    </div>
  );
}

function MarkTab({ toast, canMark, classOptions }) {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!className || !section || !date) return;
    setLoading(true);
    try {
      const data = await api.get(
        `/attendance/roster?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}&date=${date}`
      );
      setStudents(data.students);
      setStatuses(Object.fromEntries(data.students.map((s) => [s.id, s.status])));
    } catch (err) {
      toast.error(err.message || "Couldn't load roster");
      setStudents(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, section, date]);

  function setStatus(studentId, status) {
    setStatuses((prev) => ({ ...prev, [studentId]: prev[studentId] === status ? null : status }));
  }

  function markAllPresent() {
    setStatuses((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, "present"])));
  }

  async function handleSave() {
    const records = Object.entries(statuses)
      .filter(([, status]) => status)
      .map(([studentId, status]) => ({ studentId, status }));
    if (records.length === 0) {
      toast.error("Mark at least one student before saving");
      return;
    }
    setSaving(true);
    try {
      await api.post("/attendance", { date, records });
      toast.success(`Saved attendance for ${records.length} student${records.length === 1 ? "" : "s"}`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't save attendance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <ClassSectionPicker
          classOptions={classOptions}
          className={className}
          section={section}
          onChange={(c, s) => {
            setClassName(c);
            setSection(s);
            setStudents(null);
          }}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 13.5
          }}
        />
        {canMark && students && students.length > 0 && (
          <button
            onClick={markAllPresent}
            style={{
              padding: "8px 14px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 13
            }}
          >
            Mark all present
          </button>
        )}
      </div>

      {!className && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Pick a class and section to load the roster.</p>}
      {className && loading && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>}
      {className && !loading && students && students.length === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>
          No active students in {className}-{section}.
        </p>
      )}

      {className && !loading && students && students.length > 0 && (
        <>
          <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {students.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderBottom: i === students.length - 1 ? "none" : "1px solid var(--border-soft)"
                }}
              >
                <span style={{ flex: 1, fontSize: 13.5 }}>
                  {s.name} <span style={{ color: "var(--text-faint)" }}>· Roll {s.rollNo}</span>
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const active = statuses[s.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        disabled={!canMark}
                        onClick={() => setStatus(s.id, opt.value)}
                        title={opt.value}
                        style={{
                          width: 34,
                          height: 30,
                          borderRadius: 8,
                          border: `1px solid ${active ? opt.color : "var(--border)"}`,
                          background: active ? opt.color : "transparent",
                          color: active ? "#0a0c10" : "var(--text-dim)",
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: canMark ? "pointer" : "default"
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {canMark && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                borderRadius: 9,
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontWeight: 600,
                fontSize: 13.5
              }}
            >
              {saving ? "Saving…" : "Save attendance"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTab({ toast }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState(thisMonthStr());
  const [summary, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);

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

  async function load(studentId, m) {
    setLoading(true);
    try {
      const data = await api.get(`/attendance/summary?studentId=${studentId}&month=${m}`);
      setSummaryData(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load attendance summary");
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selected) load(selected.id, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, month]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", maxWidth: 340, flex: 1, minWidth: 240 }}>
          <input
            placeholder="Search a student…"
            value={selected ? `${selected.name} (${selected.className}-${selected.section})` : query}
            onChange={(e) => {
              setSelected(null);
              setSummaryData(null);
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
                  onClick={() => {
                    setSelected(s);
                    setQuery("");
                    setResults([]);
                  }}
                  style={{ padding: "10px 14px", fontSize: 13.5, cursor: "pointer", borderBottom: "1px solid var(--border-soft)" }}
                >
                  {s.name}{" "}
                  <span style={{ color: "var(--text-faint)" }}>
                    · {s.className}-{s.section} · Roll {s.rollNo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 13.5
          }}
        />
      </div>

      {!selected && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Search for a student to see their monthly attendance.</p>}
      {selected && loading && <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Loading…</p>}

      {selected && !loading && summary && (
        <div>
          <div style={{ display: "flex", gap: 24, marginBottom: 18, flexWrap: "wrap" }}>
            <Stat label="Present" value={summary.presentCount} color="var(--sync-live, #2ecc71)" />
            <Stat label="Late" value={summary.lateCount} color="var(--warning, #e6b800)" />
            <Stat label="Absent" value={summary.absentCount} color="var(--danger, #e5484d)" />
            <Stat label="Attendance %" value={summary.percentage === null ? "—" : `${summary.percentage}%`} />
          </div>

          {summary.records.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>No attendance marked for this month yet.</p>
          ) : (
            <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              {summary.records.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 14px",
                    fontSize: 13.5,
                    borderBottom: i === summary.records.length - 1 ? "none" : "1px solid var(--border-soft)"
                  }}
                >
                  <span>{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" })}</span>
                  <span style={{ textTransform: "capitalize", color: "var(--text-dim)" }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{label}</div>
    </div>
  );
}

function ExportTab({ toast, classOptions }) {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (className) params.set("className", className);
      if (section) params.set("section", section);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const blob = await api.getBlob(`/attendance/export?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export attendance");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginBottom: 16, maxWidth: 460 }}>
        Export attendance records as CSV. Leave class/section or dates blank to include everything for that filter.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <ClassSectionPicker
          classOptions={classOptions}
          className={className}
          section={section}
          onChange={(c, s) => {
            setClassName(c);
            setSection(s);
          }}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="From"
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 13.5
          }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="To"
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 13.5
          }}
        />
      </div>
      <button
        onClick={handleExport}
        disabled={downloading}
        style={{
          padding: "10px 20px",
          borderRadius: 9,
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontWeight: 600,
          fontSize: 13.5
        }}
      >
        {downloading ? "Preparing…" : "Download CSV"}
      </button>
    </div>
  );
}
