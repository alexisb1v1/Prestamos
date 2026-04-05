'use client';

import { useState, useEffect, useRef } from 'react';
import { getAllLoansUseCase, Loan } from '@/app/features/loans';
import { userService } from '@/lib/userService';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { User, Company } from '@/lib/types';
import { getLoanStatus, formatDateUTC, formatMoney } from '@/lib/loanUtils';
import CreateLoanModal from '../../components/CreateLoanModal';
import CreatePaymentModal from '../../components/CreatePaymentModal';
import LoanDetailsModal from '../../components/LoanDetailsModal';
import ReassignLoanModal from '../../components/ReassignLoanModal';
import DeleteLoanConfirmModal from '../../components/DeleteLoanConfirmModal';
import LoanShareGenerator, { LoanShareGeneratorRef } from '../../components/LoanShareGenerator';
import LoanActions from '../../components/LoanActions';
import LoadingSpinner from '../../components/LoadingSpinner';
import LoanMobileCard from '../../components/LoanMobileCard';
import StatusLegendModal from '../../components/StatusLegendModal';

// formatMoney and formatDateUTC are now imported from lib/loanUtils above

export default function PrestamosPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Optimization: Calculate today once per render
    const today = new Date();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [isLiquidated, setIsLiquidated] = useState(false);
    const [selectedCollector, setSelectedCollector] = useState('');
    const [collectors, setCollectors] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Multi-tenancy state
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    const [selectedLoanForRenewal, setSelectedLoanForRenewal] = useState<Loan | null>(null);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);

    // Reassign Modal State
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [selectedLoanForReassign, setSelectedLoanForReassign] = useState<Loan | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<Loan | null>(null);

    // Mobile Actions Menu State
    const [activeMenuLoanId, setActiveMenuLoanId] = useState<string | null>(null);

    const shareRef = useRef<LoanShareGeneratorRef>(null);

    // Click outside handler for mobile menu
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuLoanId(null);
        if (activeMenuLoanId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenuLoanId]);

    const handleOpenDetails = (loan: Loan) => {
        setSelectedLoanForDetails(loan);
        setIsDetailsModalOpen(true);
    };

    const handleOpenPayment = (loan: Loan) => {
        setSelectedLoanForPayment(loan);
        setIsPaymentModalOpen(true);
    };

    const handleRenewLoan = (loan: Loan) => {
        setSelectedLoanForRenewal(loan);
        setIsCreateModalOpen(true);
    };

    const handleOpenReassign = (loan: Loan) => {
        setSelectedLoanForReassign(loan);
        setIsReassignModalOpen(true);
    };

    const handleOpenDelete = (loan: Loan) => {
        setSelectedLoanForDelete(loan);
        setIsDeleteModalOpen(true);
    };

    useEffect(() => {
        const init = async () => {
            // Init user and data
            const user = authService.getUser();
            setCurrentUser(user);

            let companyIdToUse = user?.idCompany;

            if (user?.profile === 'OWNER') {
                const companiesData = await companyService.getAll();
                setCompanies(companiesData);
                if (companiesData.length > 0) {
                    // Set default company
                    setSelectedCompanyId(""); // Default to all
                    companyIdToUse = "";
                }
            } else {
                setSelectedCompanyId(user?.idCompany || '');
            }

            // If cobrador, we don't need to load collectors, but we need to set initial fetch correctly? 
            // Actually loadLoans depends on state, but state isn't set yet.
            // Let's call loadCollector only if Admin
            if (user?.profile === 'ADMIN' || user?.profile === 'OWNER') {
                // Pass filtered company if Owner
                const filterCompany = user.profile === 'OWNER' ? companyIdToUse : user.idCompany;
                loadCollectors(filterCompany);
            }

            // We can't call loadLoans here directly because we might need to wait for currentUser to be set 
            // if we rely on state. However, 'user' var is available.
            // Let's pass user to loadLoans to be safe or separate effect.
            loadLoans(user, companyIdToUse);
        };
        init();
    }, []);

    // Helper to reload everything when company changes (Owner only)
    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCompanyId(val);
        // Refresh data
        loadLoans(currentUser, val, isLiquidated, ''); // Reset collector when company changes for data consistency
        loadCollectors(val);
    };

    const loadLoans = async (userContext?: User | null, companyId?: string, liquidatedFilter?: boolean, collectorId?: string) => {
        const user = userContext || currentUser;
        const compId = companyId !== undefined ? companyId : selectedCompanyId;
        const liquidated = liquidatedFilter !== undefined ? liquidatedFilter : isLiquidated;
        const colId = collectorId !== undefined ? collectorId : selectedCollector;

        try {
            setLoading(true);

            let userIdFilter = colId;

            // If user is COBRADOR, force their ID
            if (user?.profile === 'COBRADOR') {
                userIdFilter = user.id;
            }

            // For Owner/Admin logic regarding companyId:
            // Admin: always send their idCompany (handled by caller or state if initialized)
            // Owner: send selected company
            // But loanService expects companyId param.

            // If user is NOT owner, companyId should be their own.
            // But we set selectedCompanyId in init for everyone.

            const result = await getAllLoansUseCase.execute(userIdFilter, searchQuery, compId, liquidated);
            
            result.match(
                (data) => setLoans(data),
                (err) => {
                    console.error('Error loading loans:', err);
                    setError('Error al cargar la lista de préstamos: ' + err.message);
                }
            );
        } finally {
            setLoading(false);
        }
    };

    const loadCollectors = async (companyId?: string) => {
        try {
            // Filter collectors by company if ID is present
            // userService.getAll now supports idCompany filter.
            const allUsers = await userService.getAll(undefined, false, companyId);
            const activeCollectors = allUsers.filter(u =>
                u.profile === 'COBRADOR' && u.status === 'ACTIVE'
            );
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
            // Fallback empty?
            setCollectors([]);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadLoans(); // Will use current state and currentUser ref
    };

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            {/* Sticky Header Section for Mobile */}
            <div style={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? '4rem' : 'auto', // Stick below the app header (4rem)
                zIndex: isMobile ? 30 : 'auto',
                backgroundColor: isMobile ? 'var(--bg-app)' : 'transparent',
                margin: isMobile ? '0 -1rem 1rem -1rem' : '0 0 2rem 0', // Changed from -2rem to -1rem to match layout padding
                padding: isMobile ? '0.75rem 1rem 1rem 1rem' : '0', // Changed from 2rem to 1rem
                borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
                boxShadow: isMobile ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: isMobile ? '0.5rem' : '1rem',
                    marginBottom: isMobile ? '0.75rem' : '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexShrink: 0 }}>
                        <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.875rem', fontWeight: 'bold' }}>Préstamos</h1>
                        {!loading && (
                            <span style={{ 
                                fontSize: isMobile ? '0.75rem' : '0.85rem', 
                                color: 'var(--text-secondary)',
                                fontWeight: '500',
                                opacity: 0.8
                            }}>
                                ({loans.length})
                            </span>
                        )}
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        gap: '0.5rem', 
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        flex: 1
                    }}>
                        <div style={{
                            display: 'flex',
                            backgroundColor: 'var(--bg-card)',
                            padding: '0.2rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.8rem'
                        }}>
                            <button
                                onClick={() => {
                                    setIsLiquidated(false);
                                    loadLoans(currentUser, selectedCompanyId, false);
                                }}
                                style={{
                                    padding: isMobile ? '0.35rem 0.6rem' : '0.4rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: !isLiquidated ? 'var(--color-primary)' : 'transparent',
                                    color: !isLiquidated ? 'white' : 'var(--text-secondary)',
                                    fontWeight: !isLiquidated ? '600' : '400',
                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Activos
                            </button>
                            <button
                                onClick={() => {
                                    setIsLiquidated(true);
                                    loadLoans(currentUser, selectedCompanyId, true);
                                }}
                                style={{
                                    padding: isMobile ? '0.35rem 0.6rem' : '0.4rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: isLiquidated ? 'var(--color-primary)' : 'transparent',
                                    color: isLiquidated ? 'white' : 'var(--text-secondary)',
                                    fontWeight: isLiquidated ? '600' : '400',
                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Liquidados
                            </button>
                        </div>
                        {!isMobile && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setIsCreateModalOpen(true)}
                                style={{ 
                                    width: 'auto', 
                                    whiteSpace: 'nowrap', 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '1rem',
                                    fontWeight: '600'
                                }}
                            >
                                + Nuevo Préstamo
                            </button>
                        )}
                    </div>
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
                        <div style={{ 
                            width: isMobile ? '100%' : 'auto',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Nombre o DNI..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: isMobile ? 'none' : '200px',
                                    backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)',
                                    paddingRight: '2.5rem'
                                }}
                            />
                            <button 
                                type="submit" 
                                style={{
                                    position: 'absolute',
                                    right: '5px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-primary)',
                                    padding: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                aria-label="Buscar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </button>
                        </div>

                        {(currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER') && (
                            <>
                                {currentUser?.profile === 'OWNER' && (
                                    <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                        <select
                                            className="input"
                                            value={selectedCompanyId}
                                            onChange={handleCompanyChange}
                                            style={{
                                                width: '100%',
                                                maxWidth: isMobile ? 'none' : '200px',
                                                backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                            }}
                                        >
                                            <option value="">Todas las empresas</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.companyName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                    <select
                                        className="input"
                                        value={selectedCollector}
                                        onChange={(e) => {
                                            const newCollector = e.target.value;
                                            setSelectedCollector(newCollector);
                                            loadLoans(currentUser, selectedCompanyId, isLiquidated, newCollector);
                                        }}
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
                            </>
                        )}

                        { (searchQuery || selectedCollector) && (
                            <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCollector('');
                                        loadLoans(currentUser, selectedCompanyId, isLiquidated);
                                    }}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        width: isMobile ? '100%' : 'initial',
                                        backgroundColor: 'var(--bg-card)',
                                        padding: '0.4rem 1rem'
                                    }}
                                >
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </form>
                    
                    <div style={{ padding: '0 0.5rem', marginTop: '0.5rem' }}>
                        <button 
                            onClick={() => setIsLegendOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                background: 'none',
                                border: 'none',
                                padding: '0.3rem 0',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            Ver estados de cobro
                        </button>
                    </div>
                </div>
            </div>

            <StatusLegendModal 
                isOpen={isLegendOpen} 
                onClose={() => setIsLegendOpen(false)} 
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
                        <LoadingSpinner message="Cargando préstamos..." />
                    ) : loans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No se encontraron préstamos.</div>
                    ) : (
                        loans.map(loan => (
                            <LoanMobileCard
                                key={loan.id}
                                loan={loan}
                                today={today}
                                currentUser={currentUser}
                                onRenew={handleRenewLoan}
                                onPay={handleOpenPayment}
                                onDetails={handleOpenDetails}
                                onReassign={handleOpenReassign}
                                onDelete={handleOpenDelete}
                                shareRef={shareRef}
                            />
                        ))
                    )}
                </div>
            ) : (
                /* Desktop View: Table */
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Cliente</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Vigencia</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Detalle del Préstamo</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Estado</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Cobrador</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6}>
                                        <LoadingSpinner message="Cargando préstamos..." />
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
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize' }}>{loan.clientName?.toLowerCase() || 'SIN NOMBRE'}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                {loan.documentNumber}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {loan.address}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)' }}>
                                                <div style={{ marginBottom: '0.25rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Inicio:</span> {formatDateUTC(loan.startDate)}
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Fin:</span> {formatDateUTC(loan.endDate)}
                                                </div>
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
                                                    <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>
                                                        {formatMoney((loan as any).remainingAmount || 0)}
                                                    </span>
                                                </div>
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
                                            <LoanActions
                                                loan={loan}
                                                currentUser={currentUser}
                                                isMobile={false}
                                                today={today}
                                                onPay={handleOpenPayment}
                                                onDetails={handleOpenDetails}
                                                onRenew={handleRenewLoan}
                                                onReassign={handleOpenReassign}
                                                onDelete={handleOpenDelete}
                                                shareRef={shareRef}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )
            }
            <CreateLoanModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedLoanForRenewal(null);
                }}
                onSuccess={() => {
                    if (currentUser) loadLoans(currentUser);
                }}
                loanToRenew={selectedLoanForRenewal}
            />

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
                shareRef={shareRef}
            />

            <ReassignLoanModal
                isOpen={isReassignModalOpen}
                onClose={() => {
                    setIsReassignModalOpen(false);
                    setSelectedLoanForReassign(null);
                }}
                onSuccess={() => {
                    if (currentUser) loadLoans(currentUser);
                }}
                loan={selectedLoanForReassign}
            />

            <DeleteLoanConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedLoanForDelete(null);
                }}
                onSuccess={() => {
                    if (currentUser) loadLoans(currentUser);
                }}
                loan={selectedLoanForDelete}
            />

            <LoanShareGenerator ref={shareRef} />
        </div>
    );
}
