'use client';

import { useState, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { authService } from '@/lib/auth';
import { Loan, User } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import CreateLoanModal from '../../components/CreateLoanModal';
import CreatePaymentModal from '../../components/CreatePaymentModal';
import LoanDetailsModal from '../../components/LoanDetailsModal';

export default function PrestamosPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [documentNumber, setDocumentNumber] = useState('');
    const [selectedCollector, setSelectedCollector] = useState('');
    const [collectors, setCollectors] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);

    const handleOpenDetails = (loan: Loan) => {
        setSelectedLoanForDetails(loan);
        setIsDetailsModalOpen(true);
    };

    const handleOpenPayment = (loan: Loan) => {
        setSelectedLoanForPayment(loan);
        setIsPaymentModalOpen(true);
    };

    useEffect(() => {
        // Init user and data
        const user = authService.getUser();
        setCurrentUser(user);

        // If cobrador, we don't need to load collectors, but we need to set initial fetch correctly? 
        // Actually loadLoans depends on state, but state isn't set yet.
        // Let's call loadCollector only if Admin
        if (user?.profile === 'ADMIN' || user?.profile === 'OWNER') {
            loadCollectors();
        }

        // We can't call loadLoans here directly because we might need to wait for currentUser to be set 
        // if we rely on state. However, 'user' var is available.
        // Let's pass user to loadLoans to be safe or separate effect.
        loadLoans(user);
    }, []);

    const loadLoans = async (userContext?: User | null) => {
        const user = userContext || currentUser;
        try {
            setLoading(true);

            let userIdFilter = selectedCollector;

            // If user is COBRADOR, force their ID
            if (user?.profile === 'COBRADOR') {
                userIdFilter = user.id;
            }

            const data = await loanService.getAll(userIdFilter, documentNumber);
            setLoans(data);
        } catch (err) {
            console.error('Error loading loans:', err);
            setError('Error al cargar la lista de préstamos.');
        } finally {
            setLoading(false);
        }
    };

    const loadCollectors = async () => {
        try {
            const allUsers = await userService.getAll();
            const activeCollectors = allUsers.filter(u =>
                u.profile === 'COBRADOR' && u.status === 'ACTIVE'
            );
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadLoans(); // Will use current state and currentUser ref
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            return format(parseISO(dateStr), 'dd/MM/yyyy');
        } catch (e) {
            console.error('Error formatting date:', dateStr, e);
            return dateStr;
        }
    };

    const formatMoney = (amount: number) => {
        return `S/ ${Number(amount).toFixed(2)}`;
    };

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'activo') return '#22c55e'; // Green
        if (['retraso', 'mora'].includes(s)) return '#eab308'; // Yellow
        if (['vencido', 'incumplido'].includes(s)) return '#ef4444'; // Red
        return '#3b82f6'; // Blue default
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const color = getStatusColor(status);
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    boxShadow: `0 0 0 2px ${color}40`
                }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {status}
                </span>
            </div>
        );
    };

    const MobileLoanCard = ({ loan }: { loan: Loan }) => (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                paddingBottom: '0.75rem',
                marginBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{loan.clientName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loan.documentNumber}</div>
                </div>
                <StatusBadge status={loan.status} />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                fontSize: '0.9rem', // Increased visibility
                marginBottom: '0.75rem'
            }}>
                <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Monto</span>
                    {formatMoney(loan.amount)}
                </div>
                <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Interés</span>
                    {formatMoney(loan.interest)}
                </div>
                <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Días</span>
                    <span>{loan.days}</span>
                </div>
                <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Cuota</span>
                    {formatMoney(loan.fee || 0)}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '1rem' }}>
                        {formatMoney(loan.amount + loan.interest)}
                    </span>
                </div>
            </div>

            <div style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                paddingBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Dirección:</span>
                    <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{loan.address}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vigencia:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatDate(loan.startDate)} - {formatDate(loan.endDate)}</span>
                </div>
            </div>

            <div style={{
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <button
                    className="btn"
                    style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        padding: '0.5rem',
                        backgroundColor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? '#94a3b8' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        cursor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 'not-allowed' : 'pointer',
                        opacity: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 0.7 : 1
                    }}
                    onClick={() => !(!!loan.paidToday || loan.inIntervalPayment === 0) && handleOpenPayment(loan)}
                    disabled={!!loan.paidToday || loan.inIntervalPayment === 0}
                >
                    {!!loan.paidToday ? 'Pagado Hoy' : (loan.inIntervalPayment === 0 ? 'Restringido' : 'Registrar Pago')}
                </button>
                <button
                    className="btn"
                    style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        padding: '0.5rem',
                        backgroundColor: 'transparent',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-primary)'
                    }}
                    onClick={() => handleOpenDetails(loan)}
                >
                    Ver Detalles
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ position: 'relative' }}>
            {/* Sticky Header Section for Mobile */}
            <div style={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? '0' : 'auto', // Stick at top of viewport
                zIndex: isMobile ? 30 : 'auto',
                backgroundColor: isMobile ? 'var(--bg-app)' : 'transparent',
                margin: isMobile ? '0 -2rem 1rem -2rem' : '0 0 2rem 0', // Removed negative margin-top
                padding: isMobile ? '0.75rem 2rem 1rem 2rem' : '0', // More compact top padding
                borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
                boxShadow: isMobile ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isMobile ? '1rem' : '2rem'
                }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 'bold' }}>Préstamos</h1>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{ width: 'auto', whiteSpace: 'nowrap', padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem', fontSize: isMobile ? '0.85rem' : '1rem' }}
                    >
                        + Nuevo {isMobile ? '' : 'Préstamo'}
                    </button>
                </div>

                {/* Search / Filters - Part of Sticky Header */}
                <div className={isMobile ? "" : "card"} style={{
                    marginBottom: isMobile ? '0' : '2rem',
                    padding: isMobile ? '0' : '1.5rem',
                    backgroundColor: isMobile ? 'transparent' : 'var(--bg-card)',
                    border: isMobile ? 'none' : '1px solid var(--border-color)',
                    boxShadow: isMobile ? 'none' : 'var(--shadow-sm)'
                }}>
                    <form onSubmit={handleSearch} style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        alignItems: 'center' // Changed from end to center since no labels
                    }}>
                        <div style={{ width: isMobile ? '100%' : 'auto' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="DNI del Cliente..."
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: isMobile ? 'none' : '200px',
                                    backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                }}
                            />
                        </div>

                        {(currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER') && (
                            <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                <select
                                    className="input"
                                    value={selectedCollector}
                                    onChange={(e) => setSelectedCollector(e.target.value)}
                                    style={{
                                        width: '100%',
                                        maxWidth: isMobile ? 'none' : '250px',
                                        backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                    }}
                                >
                                    <option value="">Todos los cobradores</option>
                                    {collectors.map(collector => (
                                        <option key={collector.id} value={collector.id}>
                                            {collector.username} ({collector.firstName} {collector.lastName})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: isMobile ? 1 : 'initial' }}>
                                Buscar
                            </button>
                            {(documentNumber || selectedCollector) && (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setDocumentNumber('');
                                        setSelectedCollector('');
                                        loadLoans(currentUser);
                                    }}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        flex: isMobile ? 1 : 'initial',
                                        backgroundColor: 'var(--bg-card)'
                                    }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <CreateLoanModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    loadLoans(currentUser);
                }}
            />

            <CreatePaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    loadLoans(currentUser);
                }}
                loan={selectedLoanForPayment}
            />

            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger)'
                }}>
                    {error}
                </div>
            )}

            {/* Mobile View: Cards */}
            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando...</div>
                    ) : loans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No se encontraron préstamos.</div>
                    ) : (
                        loans.map(loan => (
                            <MobileLoanCard key={loan.id} loan={loan} />
                        ))
                    )}
                </div>
            ) : (
                /* Desktop View: Table */
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Cliente</th>
                                <th style={{ padding: '1rem' }}>Detalle del Préstamo</th>
                                <th style={{ padding: '1rem' }}>Fechas</th>
                                <th style={{ padding: '1rem' }}>Estado</th>
                                <th style={{ padding: '1rem' }}>Cobrador</th>
                                <th style={{ padding: '1rem' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        Cargando préstamos...
                                    </td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No se encontraron préstamos.
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id} style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{loan.clientName}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                {loan.documentNumber}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {loan.address}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Monto:</span>
                                                <span style={{ fontWeight: 500 }}>{formatMoney(loan.amount)}</span>

                                                <span style={{ color: 'var(--text-secondary)' }}>Interés:</span>
                                                <span>{formatMoney(loan.interest)}</span>

                                                <span style={{ color: 'var(--text-secondary)' }}>Cuota:</span>
                                                <span>{formatMoney(loan.fee || 0)}</span>

                                                <span style={{ color: 'var(--text-secondary)' }}>Días:</span>
                                                <span>{loan.days}</span>

                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                                    {formatMoney(loan.amount + loan.interest)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            <div style={{ marginBottom: '0.25rem' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Inicio:</span> {formatDate(loan.startDate)}
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Fin:</span> {formatDate(loan.endDate)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <StatusBadge status={loan.status} />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem' }}>{loan.collectorName}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                className="btn"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    padding: '0.25rem 0.75rem',
                                                    backgroundColor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? '#94a3b8' : '#8b5cf6',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 'not-allowed' : 'pointer',
                                                    opacity: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 0.7 : 1
                                                }}
                                                onClick={() => !(!!loan.paidToday || loan.inIntervalPayment === 0) && handleOpenPayment(loan)}
                                                disabled={!!loan.paidToday || loan.inIntervalPayment === 0}
                                            >
                                                {!!loan.paidToday ? 'Pagado' : (loan.inIntervalPayment === 0 ? 'Restringido' : 'Pagar')}
                                            </button>
                                            <button
                                                className="btn"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    padding: '0.25rem 0.75rem',
                                                    backgroundColor: 'transparent',
                                                    color: 'var(--color-primary)',
                                                    border: '1px solid var(--color-primary)',
                                                    marginLeft: '0.5rem'
                                                }}
                                                onClick={() => handleOpenDetails(loan)}
                                            >
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <CreatePaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    if (currentUser) loadLoans(currentUser);
                }}
                loan={selectedLoanForPayment}
            />

            <LoanDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                loan={selectedLoanForDetails}
            />
        </div>
    );
}
