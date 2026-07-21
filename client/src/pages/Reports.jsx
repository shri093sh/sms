import { useApi } from "../hooks/useApi.js";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const panelStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: "var(--radius)",
  padding: 20,
  marginBottom: 20
};

export default function Reports() {
  const { data: feesData, loading: feesLoading, error: feesError } = useApi("/reports/fees-trend?months=6");
  const { data: attendanceData, loading: attendanceLoading, error: attendanceError } = useApi(
    "/reports/attendance-trend?months=6"
  );
  const { data: breakdownData, loading: breakdownLoading, error: breakdownError } = useApi(
    "/reports/class-breakdown"
  );

  return (
    <div>
      <h2 className="display" style={{ margin: "0 0 4px" }}>
        Reports
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>
        Fee collection, attendance trends and a per-class breakdown, last 6 months.
      </p>

      <div style={panelStyle}>
        <h3 className="display" style={{ margin: "0 0 14px", fontSize: 15 }}>
          Fees collected per month
        </h3>
        {feesError && <ErrorNote message={feesError} />}
        {feesLoading && <Loading />}
        {!feesLoading && !feesError && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={feesData?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={12} />
              <YAxis stroke="var(--text-faint)" fontSize={12} />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Collected"]}
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12.5 }}
              />
              <Line type="monotone" dataKey="totalCollected" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={panelStyle}>
        <h3 className="display" style={{ margin: "0 0 14px", fontSize: 15 }}>
          Attendance % per month
        </h3>
        {attendanceError && <ErrorNote message={attendanceError} />}
        {attendanceLoading && <Loading />}
        {!attendanceLoading && !attendanceError && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={attendanceData?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={12} />
              <YAxis stroke="var(--text-faint)" fontSize={12} domain={[0, 100]} />
              <Tooltip
                formatter={(value) => [value != null ? `${value}%` : "No data", "Attendance"]}
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12.5 }}
              />
              <Line
                type="monotone"
                dataKey="attendancePct"
                stroke="var(--sync-live, #34d399)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={panelStyle}>
        <h3 className="display" style={{ margin: "0 0 14px", fontSize: 15 }}>
          Class breakdown (this month)
        </h3>
        {breakdownError && <ErrorNote message={breakdownError} />}
        {breakdownLoading && <Loading />}
        {!breakdownLoading && !breakdownError && (breakdownData?.breakdown?.length || 0) === 0 && (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No active students yet.</p>
        )}
        {!breakdownLoading && !breakdownError && (breakdownData?.breakdown?.length || 0) > 0 && (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={breakdownData.breakdown.map((b) => ({ ...b, classLabel: `${b.className}-${b.section}` }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="classLabel" stroke="var(--text-faint)" fontSize={12} />
                <YAxis stroke="var(--text-faint)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12.5 }} />
                <Bar dataKey="studentCount" name="Students" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-faint)", fontSize: 11.5, textTransform: "uppercase" }}>
                  <th style={{ padding: "6px 8px" }}>Class</th>
                  <th style={{ padding: "6px 8px" }}>Students</th>
                  <th style={{ padding: "6px 8px" }}>Fees collected</th>
                  <th style={{ padding: "6px 8px" }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {breakdownData.breakdown.map((b) => (
                  <tr key={`${b.className}-${b.section}`} style={{ borderTop: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: "8px" }}>
                      {b.className} - {b.section}
                    </td>
                    <td style={{ padding: "8px" }}>{b.studentCount}</td>
                    <td style={{ padding: "8px" }}>₹{b.feesCollectedThisMonth.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px" }}>
                      {b.attendancePctThisMonth != null ? `${b.attendancePctThisMonth}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Loading…</p>;
}

function ErrorNote({ message }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid var(--danger)",
        color: "var(--danger)",
        fontSize: 13
      }}
    >
      Couldn't load this report: {message}
    </div>
  );
}
