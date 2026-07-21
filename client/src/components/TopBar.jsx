import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useBranch } from "../context/BranchContext.jsx";
import ConnectionStatus from "./ConnectionStatus.jsx";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function TopBar({ orgName = "Prerana SMS", onMenuClick }) {
  const { user, logout } = useAuth();
  const { branches, branchId, selectBranch, isAdmin } = useBranch();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      style={{
        height: 60,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid var(--border-soft)",
        background: "var(--panel)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="app-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: 16
          }}
        >
          ☰
        </button>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{orgName}</div>
        <div style={{ fontSize: 15 }}>
          {greeting()}, <strong>{user?.name}</strong>
          {user?.role && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--text-faint)"
              }}
            >
              {user.role}
            </span>
          )}
        </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isAdmin && branches.length > 0 && (
          <select
            value={branchId}
            onChange={(e) => selectBranch(e.target.value)}
            aria-label="Branch context"
            style={{
              padding: "7px 10px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 13
            }}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <ConnectionStatus />
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: 13
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
