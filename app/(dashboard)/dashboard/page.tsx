'use client';

import { useState, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { authService } from '@/lib/auth';
import { DashboardData, Loan, User } from '@/lib/types';
import CreatePaymentModal from '../../components/CreatePaymentModal';

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    // Auth & Filtering state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | number>('');
    const [collectors, setCollectors] = useState<User[]>([]);
    const [loadingCollectors, setLoadingCollectors] = useState(false);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

    const handleOpenPayment = (loan: Loan) => {
        setSelectedLoanForPayment(loan);
        setIsPaymentModalOpen(true);
    };

    const loadDashboard = async (userIdFilter?: string | number) => {
        try {
            setLoading(true);
            const result = await loanService.getDashboardData(userIdFilter);
            setData(result);
        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError('Error al cargar los datos del dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const loadCollectors = async () => {
        try {
            setLoadingCollectors(true);
            const allUsers = await userService.getAll();
            // Filter only active collectors
            const activeCollectors = allUsers.filter(u => u.status === 'ACTIVE' && u.profile === 'COBRADOR');
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
        } finally {
            setLoadingCollectors(false);
        }
    };

    useEffect(() => {
        const user = authService.getUser();
        setCurrentUser(user);

        if (user) {
            if (user.profile === 'ADMIN' || user.profile === 'OWNER') {
                loadCollectors();
                loadDashboard(''); // Admin sees global by default or can filter
            } else {
                // For COBRADOR, always use their ID
                setSelectedUserId(user.id);
                loadDashboard(user.id);
            }
        }

        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedUserId(val);
        loadDashboard(val);
    };

    const formatMoney = (amount: number) => {
        return `S/ ${Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    if (loading && !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando resumen...</div>;
    if (error) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>;

    const isAdmin = currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER';

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 'bold' }}>Resumen</h1>

                {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Filtrar por Cobrador:</span>
                        <select
                            className="input"
                            style={{ padding: '0.4rem', fontSize: '0.875rem', width: isMobile ? '100%' : '200px' }}
                            value={selectedUserId}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todos los cobradores</option>
                            {collectors.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.username} ({c.firstName} {c.lastName})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Actualizando datos...</div>
            ) : !data ? (
                null
            ) : (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: isMobile ? '0.75rem' : '1.5rem'
                    }}>
                        {/* Stat Cards */}
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Préstamos Hoy</h3>
                            <p style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 'bold', color: 'var(--color-primary)', margin: '0.25rem 0' }}>{formatMoney(data.totalLentToday)}</p>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Cobrado Hoy</h3>
                            <p style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.25rem 0' }}>{formatMoney(data.collectedToday)}</p>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Clientes Activos</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.25rem 0' }}>{data.activeClients}</p>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Meta Diaria</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'var(--color-success)', margin: '0.25rem 0' }}>S/ 5,000</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Ruta de Cobro (Hoy)</h2>

                        {data.pendingLoans.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No hay préstamos pendientes para cobrar hoy.
                            </div>
                        ) : isMobile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {data.pendingLoans.map((loan) => (
                                    <div key={loan.id} className="card" style={{ padding: '1rem' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingBottom: '0.75rem',
                                            marginBottom: '0.75rem',
                                            borderBottom: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{loan.clientName}</div>
                                            <span style={{
                                                color: loan.paidToday > 0 ? 'var(--color-success)' : 'var(--color-warning)',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                {loan.paidToday > 0 ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </div>

                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.4rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Dirección:</span>
                                                <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{loan.address}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Cuota:</span>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatMoney(loan.fee)}</span>
                                            </div>
                                            {loan.paidToday > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Ya pagó:</span>
                                                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatMoney(loan.paidToday)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="btn btn-primary"
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                backgroundColor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? '#94a3b8' : 'var(--color-primary)',
                                                cursor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 'not-allowed' : 'pointer'
                                            }}
                                            disabled={!!loan.paidToday || loan.inIntervalPayment === 0}
                                            onClick={() => handleOpenPayment(loan)}
                                        >
                                            {!!loan.paidToday ? 'Completado' : (loan.inIntervalPayment === 0 ? 'Restringido' : 'Cobrar')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left' }}>
                                        <tr>
                                            <th style={{ padding: '1rem' }}>Cliente</th>
                                            <th style={{ padding: '1rem' }}>Dirección</th>
                                            <th style={{ padding: '1rem' }}>Cuota</th>
                                            <th style={{ padding: '1rem' }}>Pagado</th>
                                            <th style={{ padding: '1rem' }}>Estado</th>
                                            <th style={{ padding: '1rem' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.pendingLoans.map((loan) => (
                                            <tr key={loan.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{loan.clientName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{loan.documentNumber}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>{loan.address}</td>
                                                <td style={{ padding: '1rem' }}>{formatMoney(loan.fee)}</td>
                                                <td style={{ padding: '1rem' }}>{formatMoney(loan.paidToday || 0)}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        color: loan.paidToday > 0 ? 'var(--color-success)' : 'var(--color-warning)',
                                                        fontWeight: 600
                                                    }}>
                                                        {loan.paidToday >= loan.fee ? 'Completado' : (loan.paidToday > 0 ? 'Parcial' : 'Pendiente')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{
                                                            fontSize: '0.875rem',
                                                            padding: '0.25rem 0.75rem',
                                                            backgroundColor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? '#94a3b8' : 'var(--color-primary)'
                                                        }}
                                                        disabled={!!loan.paidToday || loan.inIntervalPayment === 0}
                                                        onClick={() => handleOpenPayment(loan)}
                                                    >
                                                        {!!loan.paidToday ? 'Listo' : 'Cobrar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modals */}
            <CreatePaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    loadDashboard(selectedUserId);
                }}
                loan={selectedLoanForPayment}
            />
        </div>
    );
}
