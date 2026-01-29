'use client';

import { useState, useEffect, useRef } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { authService } from '@/lib/auth';
import { Loan, User } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import CreateLoanModal from '../../components/CreateLoanModal';
import CreatePaymentModal from '../../components/CreatePaymentModal';
import LoanDetailsModal from '../../components/LoanDetailsModal';
import LoanShareGenerator, { LoanShareGeneratorRef } from '../../components/LoanShareGenerator';
import { getLoanStatus } from '@/lib/loanUtils';

export default function PrestamosPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Optimization: Calculate today once per render
    const today = new Date();

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
    const shareRef = useRef<LoanShareGeneratorRef>(null);

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
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }} title={getLoanStatus(loan, today).label}>
                    {getLoanStatus(loan, today).icon}
                </span>
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
                <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                        {formatMoney(loan.amount + loan.interest)}
                    </span>
                </div>
                <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Restante</span>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem' }}>
                        {formatMoney((loan as any).remainingAmount || 0)}
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
                gap: '1rem',
                justifyContent: 'center'
            }}>
                <button
                    onClick={() => !(!!loan.paidToday || loan.inIntervalPayment === 0) && handleOpenPayment(loan)}
                    disabled={!!loan.paidToday || loan.inIntervalPayment === 0}
                    title={!!loan.paidToday ? 'Pagado' : (loan.inIntervalPayment === 0 ? 'Restringido' : 'Registrar Pago')}
                    style={{
                        padding: '0.6rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 'not-allowed' : 'pointer',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: (!!loan.paidToday || loan.inIntervalPayment === 0) ? '#94a3b8' : '#22c55e',
                        opacity: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 0.5 : 1,
                        flex: 1
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                        <span style={{ fontSize: '0.75rem' }}>Pagar</span>
                    </div>
                </button>

                <button
                    onClick={() => handleOpenDetails(loan)}
                    title="Ver Detalles"
                    style={{
                        padding: '0.6rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        flex: 1
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span style={{ fontSize: '0.75rem' }}>Detalles</span>
                    </div>
                </button>

                <button
                    onClick={() => shareRef.current?.shareLoan(loan)}
                    title="Compartir Ficha"
                    style={{
                        padding: '0.6rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        flex: 1
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                        <span style={{ fontSize: '0.75rem' }}>Compartir</span>
                    </div>
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

            {/* Status Legend */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                backgroundColor: 'var(--bg-card)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                width: 'fit-content'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>🟢</span> <span>Al día / Reciente</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>🟡</span> <span>Mora Leve (≤ 50%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>🔴</span> <span>Mora Grave (&gt; 50%)</span>
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                {/* First row */}
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Monto:</span>
                                                    <span style={{ fontWeight: 500 }}>{formatMoney(loan.amount)}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Interés:</span>
                                                    <span>{formatMoney(loan.interest)}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', fontWeight: 500 }}>Total:</span>
                                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                                        {formatMoney(loan.amount + loan.interest)}
                                                    </span>
                                                </div>

                                                {/* Second row */}
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Cuota:</span>
                                                    <span>{formatMoney(loan.fee || 0)}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Días:</span>
                                                    <span>{loan.days}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Restante:</span>
                                                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                                                        {formatMoney((loan as any).remainingAmount || 0)}
                                                    </span>
                                                </div>
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
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.25rem', lineHeight: 1 }} title={getLoanStatus(loan, today).label}>
                                                {getLoanStatus(loan, today).icon}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem' }}>{loan.collectorName}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                {/* Payment Action */}
                                                <button
                                                    onClick={() => !(!!loan.paidToday || loan.inIntervalPayment === 0) && handleOpenPayment(loan)}
                                                    disabled={!!loan.paidToday || loan.inIntervalPayment === 0}
                                                    title={!!loan.paidToday ? 'Pagado' : (loan.inIntervalPayment === 0 ? 'Restringido' : 'Registrar Pago')}
                                                    style={{
                                                        padding: '0.35rem',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        cursor: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 'not-allowed' : 'pointer',
                                                        borderRadius: '0.375rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        color: (!!loan.paidToday || loan.inIntervalPayment === 0) ? '#94a3b8' : '#22c55e',
                                                        opacity: (!!loan.paidToday || loan.inIntervalPayment === 0) ? 0.5 : 1
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!(!!loan.paidToday || loan.inIntervalPayment === 0)) {
                                                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                                    </svg>
                                                </button>

                                                {/* Details Action */}
                                                <button
                                                    onClick={() => handleOpenDetails(loan)}
                                                    title="Ver Detalles"
                                                    style={{
                                                        padding: '0.35rem',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        cursor: 'pointer',
                                                        borderRadius: '0.375rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        color: '#64748b'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                                        e.currentTarget.style.color = '#2563eb';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = '#64748b';
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>

                                                {/* Share Action */}
                                                <button
                                                    onClick={() => shareRef.current?.shareLoan(loan)}
                                                    title="Compartir Ficha"
                                                    style={{
                                                        padding: '0.35rem',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        cursor: 'pointer',
                                                        borderRadius: '0.375rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        color: '#64748b'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(100, 116, 139, 0.1)';
                                                        e.currentTarget.style.color = '#475569';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = '#64748b';
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                                    </svg>
                                                </button>
                                            </div>
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
            <LoanShareGenerator ref={shareRef} />
        </div>
    );
}
