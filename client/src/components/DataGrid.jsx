// Generic sortable data grid. `columns`: [{ key, label, sortable, render? }].
// Sorting/pagination state is owned by the caller (server does the actual
// sort/paginate) — this component just renders headers as click targets
// and calls `onSort(key)`.
export default function DataGrid({ columns, rows, rowKey, sort, dir, onSort, actions, loading, emptyMessage }) {
  return (
    <div
      className="scroll-x"
      style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}
    >
      <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: "var(--panel-2)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && onSort?.(col.key)}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  color: "var(--text-dim)",
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: "none",
                  whiteSpace: "nowrap"
                }}
              >
                {col.label}
                {col.sortable && sort === col.key && (dir === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
            {actions && <th style={{ padding: "10px 14px" }} />}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: 24, textAlign: "center", color: "var(--text-faint)" }}>
                Loading…
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: 24, textAlign: "center", color: "var(--text-faint)" }}>
                {emptyMessage || "No results"}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row) => (
              <tr key={row[rowKey]} style={{ borderTop: "1px solid var(--border-soft)" }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "11px 14px", color: "var(--text)" }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td style={{ padding: "11px 14px", textAlign: "right", whiteSpace: "nowrap" }}>{actions(row)}</td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
