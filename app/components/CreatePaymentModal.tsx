'use client';

import { useState, useEffect } from 'react';
import { 
    Banknote, 
    Smartphone, 
    X, 
    AlertCircle,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown
} from 'lucide-react';
import { paymentService } from '@/lib/paymentService';
import { Loan, User } from '@/lib/types';
import { authService } from '@/lib/auth';
import styles from './CreatePaymentModal.module.css';

interface CreatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    loan: Loan | null;
}

export default function CreatePaymentModal({ isOpen, onClose, onSuccess, loan }: CreatePaymentModalProps) {
    // State for amount - user requested ONLY integers
    const [amount, setAmount] = useState<number | ''>('');
    const [paymentType, setPaymentType] = useState<'EFECTIVO' | 'YAPE'>('YAPE'); // Yape is default in design
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && loan) {
            // Default to fee, but rounded to nearest integer as requested
            setAmount(Math.round(loan.fee || 0));
            setError('');
            // Set YAPE as default matched with design image
            setPaymentType('YAPE');
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
                amount: Math.floor(Number(amount)), // Ensure integer just in case
                userId: String(user.id),
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
                    <button onClick={onClose} className={styles.closeButton} aria-label="Cerrar">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Client Info */}
                <div className={styles.section}>
                    <div className={styles.label}>CLIENTE</div>
                    <div className={styles.value}>{loan.clientName}</div>
                </div>

                {error && (
                    <div className={styles.error}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Payment Type Selection */}
                <div className={styles.section}>
                    <label className={styles.label}>TIPO DE PAGO</label>
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
                                <div className={styles.iconWrapper}>
                                    <Banknote size={24} strokeWidth={2.5} />
                                </div>
                                <span className={styles.paymentTypeName}>Efectivo</span>
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
                                <div className={styles.iconWrapper}>
                                    <Smartphone size={24} strokeWidth={2.5} />
                                </div>
                                <span className={styles.paymentTypeName}>Yape</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Amount Input */}
                <div className={styles.section}>
                    <label className={styles.label}>MONTO A PAGAR (S/)</label>
                    <div className={styles.amountInputWrapper}>
                        <input
                            type="number"
                            className={styles.input}
                            value={amount}
                            onChange={e => {
                                // Only allow integers
                                const val = e.target.value;
                                if (val === '') setAmount('');
                                else setAmount(Math.floor(Number(val)));
                            }}
                            step="1"
                            placeholder="0"
                            autoFocus
                        />
                        <div className={styles.currencyIndicator}>
                            PEN
                            <ChevronsUpDown size={14} />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.actions}>
                    <button 
                        className={styles.secondaryBtn} 
                        onClick={onClose} 
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button 
                        className={styles.primaryBtn} 
                        onClick={handlePayment} 
                        disabled={loading || !amount}
                    >
                        {loading ? 'Procesando...' : 'Abonar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
