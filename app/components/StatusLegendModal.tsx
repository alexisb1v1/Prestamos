'use client';

import React from 'react';
import styles from './StatusLegendModal.module.css';

interface StatusLegendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StatusLegendModal({ isOpen, onClose }: StatusLegendModalProps) {
    if (!isOpen) return null;

    const legendItems = [
        { icon: '🟢', title: 'Al día', desc: 'Cliente con pago puntual (0-1 días s/pago)' },
        { icon: '🟡', title: 'Mora Leve', desc: 'Retraso moderado (2-5 días s/pago)' },
        { icon: '🔴', title: 'Mora Grave', desc: 'Retraso crítico (6+ días s/pago)' },
        { icon: '🔵', title: 'Liquidado', desc: 'Préstamo pagado en su totalidad' }
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Estados de Pago</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className={styles.content}>
                    {legendItems.map((item, idx) => (
                        <div key={idx} className={styles.legendItem}>
                            <div className={styles.iconWrapper}>
                                {item.icon}
                            </div>
                            <div className={styles.itemText}>
                                <span className={styles.itemTitle}>{item.title}</span>
                                <span className={styles.itemDesc}>{item.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.footer}>
                    <button className={styles.btnPrimary} onClick={onClose}>Entendido</button>
                </div>
            </div>
        </div>
    );
}
