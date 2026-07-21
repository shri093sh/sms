// Styled like the original app's stat-grid cards. `loading` renders a
// pulse placeholder instead of the value so the grid doesn't jump around
// while stats load.
export default function StatCard({ label, value, hint, loading, accent = false }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0
      }}
    >
      <div style={{ fontSize: 12.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      {loading ? (
        <div
          style={{
            height: 30,
            width: "60%",
            borderRadius: 6,
            background: "var(--panel-2)",
            animation: "pulse 1.4s ease-in-out infinite"
          }}
        />
      ) : (
        <div
          className="display"
          style={{ fontSize: 26, color: accent ? "var(--accent)" : "var(--text)" }}
        >
          {value}
        </div>
      )}
      {hint && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{hint}</div>}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
