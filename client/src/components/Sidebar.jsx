import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "◱" },
  { to: "/students", label: "Students", icon: "🎓" },
  { to: "/fees", label: "Fees", icon: "₹" },
  { to: "/attendance", label: "Attendance", icon: "✓" },
  { to: "/staff", label: "Staff", icon: "🧑‍🏫", roles: ["admin", "teacher"] },
  { to: "/timetable", label: "Timetable", icon: "📅", roles: ["admin", "teacher"] },
  { to: "/payroll", label: "Payroll", icon: "💰", roles: ["admin"] },
  { to: "/exams", label: "Exams", icon: "📝" },
  { to: "/assignments", label: "Assignments", icon: "📚" },
  { to: "/reports", label: "Reports", icon: "📊", roles: ["admin", "accountant"] },
  { to: "/settings", label: "Settings", icon: "⚙" }
];

// `open` only matters below the 860px breakpoint (see theme.css) where the
// sidebar becomes an off-canvas drawer; above it the .app-sidebar class has
// no transform applied so this prop is simply unused.
export default function Sidebar({ open = false, onNavigate }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside
      className={`app-sidebar${open ? " open" : ""}`}
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--border-soft)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px",
        height: "100vh"
      }}
      onClick={onNavigate}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
        <span className="display" style={{ fontSize: 16 }}>
          Prerana SMS
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 14,
              textDecoration: "none",
              color: isActive ? "var(--accent-ink)" : "var(--text-dim)",
              background: isActive ? "var(--accent)" : "transparent",
              fontWeight: isActive ? 600 : 400
            })}
          >
            <span aria-hidden style={{ width: 18, textAlign: "center" }}>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
