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

export default function CreatePaymentModal({ isOpen, onClose, onSuccess, loan }: CreatePaymentModalProps) {
    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && loan) {
            // Pre-fill with loan fee (cuota)
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
                userId: Number(user.id)
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Registrar Pago</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cliente</div>
                    <div style={{ fontWeight: 'bold' }}>{loan.clientName}</div>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="label">Monto a Pagar (S/)</label>
                    <input
                        type="number"
                        className="input"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        step="0.01"
                        autoFocus
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePayment} disabled={loading || !amount}>
                        {loading ? 'Procesando...' : 'Abonar'}
                    </button>
                    <button className="btn" style={{ flex: 1, border: '1px solid var(--border-color)' }} onClick={onClose} disabled={loading}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
