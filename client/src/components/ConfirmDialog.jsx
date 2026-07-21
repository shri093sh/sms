import Modal from "./Modal.jsx";

// Confirmation dialog for destructive/irreversible actions (delete student,
// void an installment, remove staff, etc. — used from Phase 6 onward).
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={380}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)"
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              background: danger ? "var(--danger)" : "var(--accent)",
              color: danger ? "#2A0D0D" : "var(--accent-ink)",
              fontWeight: 600
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}
