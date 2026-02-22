'use client';

import { useState, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { Loan, User, Company } from '@/lib/types';

interface ReassignLoanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    loan: Loan | null;
}

export default function ReassignLoanModal({ isOpen, onClose, onSuccess, loan }: ReassignLoanModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [companies, setCompanies] = useState<Company[]>([]);
    const [collectors, setCollectors] = useState<User[]>([]);

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [selectedCollectorId, setSelectedCollectorId] = useState<string>('');

    const currentUser = authService.getUser();
    const isOwner = currentUser?.profile === 'OWNER';

    useEffect(() => {
        if (isOpen && loan) {
            setError('');
            setSelectedCollectorId('');

            // Initialization
            if (isOwner) {
                loadCompanies();
                // If the loan already has a companyId, we could pre-select it
                if (loan.companyId) {
                    setSelectedCompanyId(loan.companyId.toString());
                    loadCollectors(loan.companyId.toString());
                }
            } else {
                // Admin use their own company
                const companyId = currentUser?.idCompany || '';
                setSelectedCompanyId(companyId);
                loadCollectors(companyId);
            }
        }
    }, [isOpen, loan, isOwner, currentUser?.idCompany]);

    const loadCompanies = async () => {
        try {
            const data = await companyService.getAll();
            setCompanies(data);
        } catch (err) {
            console.error('Error loading companies:', err);
        }
    };

    const loadCollectors = async (companyId: string) => {
        if (!companyId) {
            setCollectors([]);
            return;
        }

        setLoading(true);
        try {
            const allUsers = await userService.getAll(undefined, false, companyId);
            const activeCollectors = allUsers.filter(u =>
                u.profile === 'COBRADOR' && u.status === 'ACTIVE'
            );
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
            setCollectors([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCompanyId(val);
        setSelectedCollectorId('');
        loadCollectors(val);
    };

    const handleReassign = async () => {
        if (!loan || !selectedCollectorId) return;

        setSubmitting(true);
        setError('');
        try {
            await loanService.reassign(loan.id, parseInt(selectedCollectorId));
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error reassigning loan:', err);
            setError(err.message || 'Error al reasignar el préstamo.');
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
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100, // Higher than details modal
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Reasignar Cobrador</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <div style={{ fontWeight: 'bold' }}>Préstamo para:</div>
                    <div style={{ textTransform: 'capitalize' }}>{loan.clientName?.toLowerCase() || 'SIN NOMBRE'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ID: #{loan.id} | Cobrador actual: {loan.collectorName}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {isOwner && (
                        <div>
                            <label className="label">Empresa</label>
                            <select
                                className="input"
                                value={selectedCompanyId}
                                onChange={handleCompanyChange}
                            >
                                <option value="">Seleccionar empresa...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.companyName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="label">Nuevo Cobrador</label>
                        <select
                            className="input"
                            value={selectedCollectorId}
                            onChange={(e) => setSelectedCollectorId(e.target.value)}
                            disabled={loading || !selectedCompanyId}
                        >
                            <option value="">{loading ? 'Cargando...' : 'Seleccionar cobrador...'}</option>
                            {collectors.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.username} ({c.firstName} {c.lastName})
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            className="btn"
                            style={{ flex: 1, backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            onClick={handleReassign}
                            disabled={submitting || !selectedCollectorId}
                        >
                            {submitting ? 'Procesando...' : 'Reasignar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
