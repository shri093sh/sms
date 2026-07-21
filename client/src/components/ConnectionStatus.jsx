import { useEffect, useState } from "react";

// Replaces the original app's P2P mesh sync-status pill. There's no mesh
// anymore (single REST API + Postgres is the one source of truth), so this
// just reflects whether /api/health is reachable — connecting / live / off.
export default function ConnectionStatus() {
  const [state, setState] = useState("checking"); // checking | live | off

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health");
        if (!cancelled) setState(res.ok ? "live" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    }

    check();
    const id = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const config = {
    checking: { color: "var(--sync-pending)", label: "Connecting…" },
    live: { color: "var(--sync-live)", label: "API connected" },
    off: { color: "var(--sync-off)", label: "API unreachable" }
  }[state];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--panel-2)",
        fontSize: 12,
        color: "var(--text-dim)"
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: config.color,
          boxShadow: state === "live" ? `0 0 6px ${config.color}` : "none"
        }}
      />
      {config.label}
    </div>
  );
}
