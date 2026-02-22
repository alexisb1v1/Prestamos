'use client';

import { useState, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { Loan } from '@/lib/types';

interface DeleteLoanConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    loan: Loan | null;
}

export default function DeleteLoanConfirmModal({ isOpen, onClose, onSuccess, loan }: DeleteLoanConfirmModalProps) {
    const [securityCode, setSecurityCode] = useState('');
    const [userInput, setUserInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const generateCode = () => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setSecurityCode(code);
    };

    useEffect(() => {
        if (isOpen) {
            generateCode();
            setUserInput('');
            setError('');
        }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!loan) return;

        if (userInput !== securityCode) {
            setError('El código ingresado no es correcto.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await loanService.delete(loan.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error deleting loan:', err);
            setError(err.message || 'Error al eliminar el préstamo.');
            generateCode(); // Change code on error
            setUserInput('');
        } finally {
            setSubmitting(false);
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
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                border: '1px solid #ef4444'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        color: '#ef4444'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="30" height="30">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>¿Eliminar Préstamo?</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Esta acción es permanente y no se puede deshacer. Se eliminarán todos los registros asociados.
                    </p>
                </div>

                <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Para confirmar, digite el siguiente número:
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.5rem',
                        color: 'var(--color-danger)',
                        userSelect: 'none'
                    }}>
                        {securityCode}
                    </div>
                </div>

                <div>
                    <input
                        type="text"
                        className="input"
                        placeholder="Código de 6 dígitos"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.1rem' }}
                        autoFocus
                    />
                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn"
                        style={{ flex: 1, backgroundColor: 'white', border: '1px solid var(--border-color)' }}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn"
                        style={{
                            flex: 1,
                            backgroundColor: userInput === securityCode ? '#ef4444' : '#9ca3af',
                            color: 'white',
                            cursor: userInput === securityCode ? 'pointer' : 'not-allowed'
                        }}
                        onClick={handleDelete}
                        disabled={submitting || userInput !== securityCode}
                    >
                        {submitting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
