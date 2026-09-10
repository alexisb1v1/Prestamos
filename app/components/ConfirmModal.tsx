"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="confirm-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="confirm-modal-box">
        {/* Mobile Handle */}
        <div className="confirm-modal-handle-bar"></div>

        <div className="confirm-modal-header">
          <h2 className="confirm-modal-title">{title}</h2>
        </div>

        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel-btn" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className="confirm-modal-confirm-btn"
            onClick={onConfirm}
            style={{ backgroundColor: isDestructive ? "#ef4444" : "#3b82f6" }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
