'use client';

import styles from './ConfirmModal.module.css';

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
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = true
}: ConfirmModalProps) {

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                {/* Mobile Handle */}
                <div className={styles.handleBar}></div>

                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                </div>

                <p className={styles.message}>
                    {message}
                </p>

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className={styles.confirmBtn}
                        onClick={onConfirm}
                        style={{ backgroundColor: isDestructive ? '#ef4444' : '#3b82f6' }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
