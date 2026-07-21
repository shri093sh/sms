import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

// Central toast system used from Phase 5 onward for save confirmations,
// errors, etc. Kept intentionally simple: no queue library, just an array
// of { id, message, tone } with auto-dismiss timers.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, { tone = "info", duration = 4000 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    show,
    dismiss,
    success: (message, opts) => show(message, { ...opts, tone: "success" }),
    error: (message, opts) => show(message, { ...opts, tone: "error" }),
    info: (message, opts) => show(message, { ...opts, tone: "info" })
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 1000
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              cursor: "pointer",
              minWidth: 240,
              maxWidth: 360,
              padding: "12px 16px",
              borderRadius: "var(--radius)",
              background: "var(--panel-2)",
              border: `1px solid ${toneBorder(t.tone)}`,
              color: "var(--text)",
              fontSize: 14,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)"
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toneBorder(tone) {
  if (tone === "success") return "var(--sync-live)";
  if (tone === "error") return "var(--danger)";
  return "var(--border)";
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
