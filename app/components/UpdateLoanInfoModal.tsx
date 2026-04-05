'use client';

import { useState } from 'react';
import { Loan, updateLoanInfoUseCase } from '@/app/features/loans';
import LoadingSpinner from './LoadingSpinner';

interface UpdateLoanInfoModalProps {
    loan: Loan;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UpdateLoanInfoModal({ loan, onClose, onSuccess }: UpdateLoanInfoModalProps) {
    const [address, setAddress] = useState(loan.address || '');
    const [phone, setPhone] = useState(loan.phone || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!address.trim()) {
            setError('La dirección es obligatoria');
            return;
        }

        setLoading(true);
        setError('');

        const result = await updateLoanInfoUseCase.execute(loan.id, {
            address: address.trim(),
            phone: phone.trim()
        });

        result.match(
            () => {
                setLoading(false);
                onSuccess();
                onClose();
            },
            (err) => {
                setLoading(false);
                setError(err.message || 'Error al actualizar la información');
            }
        );
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Actualizar Información</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && (
                        <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '0.5rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Cliente: <strong>{loan.clientName}</strong>
                    </div>

                    <div className="form-group">
                        <label className="label">Dirección</label>
                        <textarea 
                            className="input" 
                            rows={3}
                            value={address} 
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Ingrese la dirección completa"
                            style={{ resize: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Teléfono / WhatsApp</label>
                        <input 
                            type="tel" 
                            className="input" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Sugerido: 987654321"
                            inputMode="tel"
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button 
                        className="btn" 
                        onClick={onClose} 
                        style={{ flex: 1, backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSave} 
                        style={{ flex: 1 }}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: white;
                    border-radius: 1.25rem;
                    padding: 1.5rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                }
                .modal-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                .close-button {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }
            `}</style>
        </div>
    );
}
