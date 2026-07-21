import { useEffect } from "react";

// Generic modal shell for later phases (student forms, fee entry, etc.).
// No portal library needed — a fixed-position overlay is enough here.
export default function Modal({ open, onClose, title, children, footer, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,8,12,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 900
      }}
    >
      <div
        style={{
          width,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-soft)"
          }}
        >
          <h3 className="display" style={{ margin: 0, fontSize: 17 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              fontSize: 18,
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "14px 20px",
              borderTop: "1px solid var(--border-soft)"
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
