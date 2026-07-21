import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Timetable() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === "admin";

  const [classOptions, setClassOptions] = useState([]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [slots, setSlots] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingCell, setEditingCell] = useState(null); // { dayOfWeek, period, slot }

  useEffect(() => {
    api
      .get("/students/meta/classes")
      .then((data) => {
        setClassOptions(data.classes);
        if (data.classes.length && !className) {
          setClassName(data.classes[0].className);
          setSection(data.classes[0].section);
        }
      })
      .catch(() => setClassOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canEdit) {
      api
        .get("/staff?status=active")
        .then((data) => setStaffList(data.staff))
        .catch(() => setStaffList([]));
    }
  }, [canEdit]);

  async function loadGrid() {
    if (!className || !section) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ className, section });
      const data = await api.get(`/timetable?${params.toString()}`);
      setSlots(data.slots);
    } catch (err) {
      setError(err.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, section]);

  function cellFor(dayOfWeek, period) {
    return slots.find((s) => s.dayOfWeek === dayOfWeek && s.period === period) || null;
  }

  function openCell(dayOfWeek, period) {
    if (!canEdit) return;
    setEditingCell({ dayOfWeek, period, slot: cellFor(dayOfWeek, period) });
  }

  async function handleCellSave(form) {
    try {
      await api.post("/timetable/slot", {
        className,
        section,
        dayOfWeek: editingCell.dayOfWeek,
        period: editingCell.period,
        subject: form.subject,
        staffId: form.staffId || null
      });
      toast.success("Timetable updated");
      setEditingCell(null);
      loadGrid();
    } catch (err) {
      toast.error(err.message || "Couldn't save slot");
    }
  }

  async function handleCellClear() {
    if (!editingCell?.slot) {
      setEditingCell(null);
      return;
    }
    try {
      await api.del(`/timetable/slot/${editingCell.slot.id}`);
      toast.success("Slot cleared");
      setEditingCell(null);
      loadGrid();
    } catch (err) {
      toast.error(err.message || "Couldn't clear slot");
    }
  }

  return (
    <div>
      <h2 className="display" style={{ margin: "0 0 4px" }}>
        Timetable
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 18px" }}>
        {canEdit ? "Click a cell to assign a subject and teacher." : "View-only schedule for the selected class."}
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={className && section ? `${className}|${section}` : ""}
          onChange={(e) => {
            const [c, s] = e.target.value.split("|");
            setClassName(c);
            setSection(s);
          }}
          style={filterInput}
        >
          {classOptions.length === 0 && <option value="">No classes yet</option>}
          {classOptions.map((c) => (
            <option key={`${c.className}|${c.section}`} value={`${c.className}|${c.section}`}>
              {c.className} — {c.section}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="scroll-x" style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--panel-2)" }}>
              <th style={headCell}>Period</th>
              {DAYS.map((d) => (
                <th key={d} style={headCell}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period}>
                <td style={{ ...bodyCell, fontWeight: 600, color: "var(--text-dim)" }}>{period}</td>
                {DAYS.map((_, dayOfWeek) => {
                  const cell = cellFor(dayOfWeek, period);
                  return (
                    <td
                      key={dayOfWeek}
                      onClick={() => openCell(dayOfWeek, period)}
                      style={{
                        ...bodyCell,
                        cursor: canEdit ? "pointer" : "default",
                        background: cell ? "var(--panel-2)" : "transparent"
                      }}
                    >
                      {cell ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{cell.subject}</div>
                          {cell.staff && <div style={{ color: "var(--text-dim)", fontSize: 11.5 }}>{cell.staff.name}</div>}
                        </div>
                      ) : (
                        loading ? "" : <span style={{ color: "var(--text-faint)" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <CellForm
          open={!!editingCell}
          cell={editingCell}
          staffList={staffList}
          onClose={() => setEditingCell(null)}
          onSave={handleCellSave}
          onClear={handleCellClear}
        />
      )}
    </div>
  );
}

function CellForm({ open, cell, staffList, onClose, onSave, onClear }) {
  const [subject, setSubject] = useState("");
  const [staffId, setStaffId] = useState("");

  useEffect(() => {
    if (open) {
      setSubject(cell?.slot?.subject || "");
      setStaffId(cell?.slot?.staffId || "");
    }
  }, [open, cell]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cell ? `${DAYS[cell.dayOfWeek]} · Period ${cell.period}` : ""}
      footer={
        <>
          {cell?.slot && (
            <button
              type="button"
              onClick={onClear}
              style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", marginRight: "auto" }}
            >
              Clear slot
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="timetable-cell-form"
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--accent-ink)", fontWeight: 600 }}
          >
            Save
          </button>
        </>
      }
    >
      <form
        id="timetable-cell-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!subject.trim()) return;
          onSave({ subject: subject.trim(), staffId });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--text-dim)" }}>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={inputStyle}
            required
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--text-dim)" }}>
          Teacher
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} style={inputStyle}>
            <option value="">— Unassigned —</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.subject})
              </option>
            ))}
          </select>
        </label>
      </form>
    </Modal>
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

const inputStyle = {
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13.5,
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
  verticalAlign: "top"
};
