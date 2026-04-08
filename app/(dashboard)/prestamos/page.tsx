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
import DashboardFilterModal from '../../components/DashboardFilterModal';

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

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
 
    return (
        <div style={{ position: 'relative' }}>
            {/* Header Section */}
            {/* Header Section */}
            <div style={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? '4rem' : 'auto', 
                zIndex: isMobile ? 30 : 'auto',
                backgroundColor: isMobile ? 'var(--bg-app)' : 'transparent',
                margin: isMobile ? '0 -1rem 1rem -1rem' : '0 0 1.5rem 0',
                padding: isMobile ? '0.75rem 1rem 1rem 1rem' : '0',
                borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
                boxShadow: isMobile ? '0 10px 30px -10px rgba(0,0,0,0.05)' : 'none'
            }}>
                {/* Active Filter Pills (Dashboard style) */}
                {(currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER') && (
                    <div style={{
                        display: 'flex',
                        gap: '0.4rem',
                        marginBottom: '0.65rem',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ 
                            backgroundColor: 'white', 
                            padding: '0.3rem 0.65rem', 
                            borderRadius: '2rem', 
                            fontSize: '0.7rem', 
                            fontWeight: 600, 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path></svg>
                            {selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.companyName : 'Todas las empresas'}
                        </div>
                        <div style={{ 
                            backgroundColor: 'white', 
                            padding: '0.3rem 0.65rem', 
                            borderRadius: '2rem', 
                            fontSize: '0.7rem', 
                            fontWeight: 600, 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            {selectedCollector ? collectors.find(c => c.id === selectedCollector)?.username : 'Todos los cobradores'}
                        </div>
                    </div>
                )}

                {/* Header: Title, Compact Filter, and Toggle */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.875rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Préstamos</h1>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>({loans.length})</span>
                        
                        {/* Compact Filter Button (Funnel) */}
                        <button 
                            onClick={() => setIsFilterModalOpen(true)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '0.5rem',
                                background: 'white', border: '1.5px solid #f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#64748b',
                                marginLeft: '0.2rem',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            title="Filtros de Vista"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            {(selectedCompanyId || selectedCollector) && (
                                <div style={{ position: 'absolute', top: '5px', right: '5px', width: '7px', height: '7px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2.5px solid white' }}></div>
                            )}
                        </button>
                    </div>

                    {/* Compact Status Toggle */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        padding: '0.2rem',
                        borderRadius: '0.6rem',
                        border: '1px solid #e2e8f0'
                    }}>
                        <button
                            onClick={() => {
                                setIsLiquidated(false);
                                loadLoans(currentUser, selectedCompanyId, false);
                            }}
                            style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.45rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: !isLiquidated ? '#4f46e5' : 'transparent',
                                color: !isLiquidated ? 'white' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            ACTIVO
                        </button>
                        <button
                            onClick={() => {
                                setIsLiquidated(true);
                                loadLoans(currentUser, selectedCompanyId, true);
                            }}
                            style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.45rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: isLiquidated ? '#4f46e5' : 'transparent',
                                color: isLiquidated ? 'white' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            LIQ
                        </button>
                    </div>
                </div>
 
                {/* Search Bar (Compact Capsule) */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <form onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Nombre o DNI..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'white',
                                    border: '1.5px solid #f1f5f9',
                                    height: '2.6rem',
                                    borderRadius: '0.85rem',
                                    fontSize: '0.9rem',
                                    paddingLeft: '2.75rem',
                                    paddingRight: '1rem',
                                    color: '#334155',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                                }}
                            />
                        </form>
                    </div>

                </div>
            </div>

            <DashboardFilterModal 
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                companies={companies}
                collectors={collectors}
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={(newId) => {
                    setSelectedCompanyId(newId);
                    setSelectedCollector('');
                    loadCollectors(newId);
                }}
                selectedUserId={selectedCollector}
                onUserChange={setSelectedCollector}
                onApply={() => loadLoans(currentUser, selectedCompanyId, isLiquidated, selectedCollector)}
                isOwner={currentUser?.profile === 'OWNER'}
                isAdmin={currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER'}
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
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Cobrador</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5}>
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
                                loans.map((loan) => {
                                    const status = getLoanStatus(loan, today);
                                    const getStatusColor = (val: string) => {
                                        switch (val) {
                                            case 'green': return '#10b981';
                                            case 'yellow': return '#f59e0b';
                                            case 'red': return '#ef4444';
                                            case 'blue': return '#4f46e5';
                                            default: return '#94a3b8';
                                        }
                                    };
                                    const statusColor = getStatusColor(status.value);

                                    return (
                                        <tr key={loan.id} style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                            <td style={{ padding: '1rem', position: 'relative' }}>
                                                {/* Franja de Estado Dashboard Style */}
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: statusColor }}></div>
                                                
                                                <div style={{ paddingLeft: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor }}></div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize' }}>{loan.clientName?.toLowerCase() || 'SIN NOMBRE'}</div>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '0.85rem' }}>
                                                        {loan.documentNumber}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '0.85rem' }}>
                                                        {loan.address}
                                                    </div>
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
                                                        <span style={{ fontWeight: 700, color: '#ef4444' }}>
                                                            {formatMoney((loan as any).remainingAmount || 0)}
                                                        </span>
                                                    </div>
                                                </div>
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
                                    );
                                })
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
