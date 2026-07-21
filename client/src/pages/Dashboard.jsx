import { useApi } from "../hooks/useApi.js";
import StatCard from "../components/StatCard.jsx";
import AnnouncementsPanel from "../components/AnnouncementsPanel.jsx";

const STATS_POLL_MS = 30000;

export default function Dashboard() {
  const { data: stats, loading: statsLoading, error: statsError } = useApi("/stats/summary", {
    intervalMs: STATS_POLL_MS
  });
  const { data: activity, loading: activityLoading } = useApi("/stats/activity", {
    intervalMs: STATS_POLL_MS
  });

  return (
    <div>
      <h2 className="display" style={{ margin: "0 0 4px" }}>
        Dashboard
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>
        Overview of students, fees and today's attendance.
      </p>

      <AnnouncementsPanel />

      {statsError && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            fontSize: 13
          }}
        >
          Couldn't load stats: {statsError}
        </div>
      )}

      <div
        className="stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24
        }}
      >
        <StatCard label="Total students" value={stats?.totalStudents ?? "—"} loading={statsLoading} />
        <StatCard
          label="Fees collected (this month)"
          value={stats ? `₹${stats.feesCollectedThisMonth.toLocaleString("en-IN")}` : "—"}
          loading={statsLoading}
          accent
        />
        <StatCard
          label="Pending installments"
          value={stats?.pendingInstallments ?? "—"}
          loading={statsLoading}
        />
        <StatCard
          label="Today's attendance"
          value={stats?.todayAttendancePct != null ? `${stats.todayAttendancePct}%` : "Not marked yet"}
          hint={stats?.todayAttendanceMarked ? `${stats.todayAttendanceMarked} marked today` : undefined}
          loading={statsLoading}
        />
      </div>

      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius)",
          padding: 20
        }}
      >
        <h3 className="display" style={{ margin: "0 0 12px", fontSize: 15 }}>
          Recent activity
        </h3>

        {activityLoading && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Loading…</p>}

        {!activityLoading && (!activity?.items || activity.items.length === 0) && (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nothing yet — payments and attendance will show up here.</p>
        )}

        {!activityLoading && activity?.items?.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {activity.items.map((item) => (
              <li
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13.5,
                  color: "var(--text)"
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: item.type === "payment" ? "var(--accent)" : "var(--sync-live)",
                    flexShrink: 0
                  }}
                />
                <span style={{ flex: 1 }}>{item.message}</span>
                <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                  {new Date(item.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
