'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProgressInfoModal.module.css';
import { X } from 'lucide-react';

interface ProgressInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProgressInfoModal({ isOpen, onClose }: ProgressInfoModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Cálculo de Progreso</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.section}>
                        <span className={styles.sectionTitle}>Progreso Visual</span>
                        <p className={styles.sectionDesc}>
                            La barra azul representa el porcentaje real de dinero pagado sobre el total de la deuda (Capital + Interés).
                        </p>
                    </div>

                    <div className={styles.section}>
                        <span className={styles.sectionTitle}>Conteo de Cuotas</span>
                        <p className={styles.sectionDesc}>
                            Indica cuántas cuotas completas se cubren con el dinero entregado. Los decimales muestran el avance en la siguiente cuota.
                        </p>
                    </div>

                    <div className={styles.examplesBox}>
                        <span className={[styles.sectionTitle, styles.innerTitle].join(' ')} style={{ color: '#166534', fontSize: '0.75rem' }}>Ejemplos Prácticos</span>
                        
                        <div className={styles.exampleItem}>
                            <span className={styles.exampleMain}>Pago de S/ 20 de una cuota de S/ 20</span>
                            <span className={styles.exampleDetail}>Resultado: 1.0 cuotas (100% de la cuota)</span>
                        </div>

                        <div className={styles.exampleItem}>
                            <span className={styles.exampleMain}>Pago de S/ 30 de una cuota de S/ 20</span>
                            <span className={styles.exampleDetail}>Resultado: 1.5 cuotas (1 cuota + 50% de la siguiente)</span>
                        </div>

                        <div className={styles.exampleItem}>
                            <span className={styles.exampleMain}>Pago de S/ 10 de una cuota de S/ 20</span>
                            <span className={styles.exampleDetail}>Resultado: 0.5 cuotas (50% de la cuota)</span>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.btnPrimary} onClick={onClose}>Entendido</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
