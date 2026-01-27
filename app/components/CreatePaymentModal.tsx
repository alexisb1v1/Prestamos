'use client';

import { useState, useEffect } from 'react';
import { paymentService } from '@/lib/paymentService';
import { Loan, User } from '@/lib/types';
import { authService } from '@/lib/auth';

interface CreatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    loan: Loan | null;
}

import styles from './CreatePaymentModal.module.css';

// ... (props interface unchanged)

export default function CreatePaymentModal({ isOpen, onClose, onSuccess, loan }: CreatePaymentModalProps) {
    const [amount, setAmount] = useState<number | ''>('');
    const [paymentType, setPaymentType] = useState<'EFECTIVO' | 'YAPE'>('EFECTIVO');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && loan) {
            setAmount(loan.fee || 0);
            setError('');
        }
    }, [isOpen, loan]);

    const handlePayment = async () => {
        if (!loan || !amount) return;

        const user = authService.getUser();
        if (!user) {
            setError('Usuario no autenticado');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await paymentService.createInstallment({
                loanId: String(loan.id),
                amount: Number(amount),
                userId: Number(user.id),
                paymentType: paymentType
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al registrar el pago.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !loan) return null;

    return (
        <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                {/* Mobile Handle */}
                <div className={styles.handleBar}></div>

                <div className={styles.header}>
                    <h2 className={styles.title}>Registrar Pago</h2>
                    <button onClick={onClose} className={styles.closeButton}>&times;</button>
                </div>

                <div className={styles.section}>
                    <div className={styles.label}>Cliente</div>
                    <div className={styles.value}>{loan.clientName}</div>
                </div>

                {error && (
                    <div className={styles.error}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className={styles.section}>
                    <label className={styles.label}>Tipo de Pago</label>
                    <div className={styles.paymentTypeContainer}>
                        <label className={styles.paymentTypeCard}>
                            <input
                                type="radio"
                                name="paymentType"
                                value="EFECTIVO"
                                checked={paymentType === 'EFECTIVO'}
                                onChange={() => setPaymentType('EFECTIVO')}
                            />
                            <div className={styles.cardContent}>
                                <span style={{ fontSize: '1.5rem' }}>💵</span>
                                <span style={{ fontWeight: '500' }}>Efectivo</span>
                            </div>
                        </label>
                        <label className={styles.paymentTypeCard}>
                            <input
                                type="radio"
                                name="paymentType"
                                value="YAPE"
                                checked={paymentType === 'YAPE'}
                                onChange={() => setPaymentType('YAPE')}
                            />
                            <div className={styles.cardContent}>
                                <span style={{ fontSize: '1.5rem' }}>📱</span>
                                <span style={{ fontWeight: '500' }}>Yape</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <label className={styles.label}>Monto a Pagar (S/)</label>
                    <input
                        type="number"
                        className={styles.input}
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        step="0.01"
                        autoFocus
                    />
                </div>

                <div className={styles.actions}>
                    <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
                        Cancelar
                    </button>
                    <button className={styles.primaryBtn} onClick={handlePayment} disabled={loading || !amount}>
                        {loading ? 'Procesando...' : 'Abonar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
