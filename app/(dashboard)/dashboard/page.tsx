'use client';

import { useState, useEffect, useRef } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { DashboardData, Loan, User, Company } from '@/lib/types';
import { getLoanStatus, formatDateUTC, formatMoney } from '@/lib/loanUtils';
import CreatePaymentModal from '../../components/CreatePaymentModal';
import LoanDetailsModal from '../../components/LoanDetailsModal';
import CreateLoanModal from '../../components/CreateLoanModal';
import ReassignLoanModal from '../../components/ReassignLoanModal';
import DeleteLoanConfirmModal from '../../components/DeleteLoanConfirmModal';
import LoanShareGenerator, { LoanShareGeneratorRef } from '../../components/LoanShareGenerator';
import LoanActions from '../../components/LoanActions';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnimatedNumber from '../../components/AnimatedNumber';
import LoanMobileCard from '../../components/LoanMobileCard';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    saveCollectionOrder,
    getCollectionOrder,
    applySavedOrder,
    cleanupOldOrders,
} from '@/lib/collectionOrderStorage';

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [searchTermLocal, setSearchTermLocal] = useState('');

    // Share Generator Ref
    const shareRef = useRef<LoanShareGeneratorRef>(null);

    // Drag & Drop state
    const [orderedLoans, setOrderedLoans] = useState<Loan[]>([]);

    // Optimization: Calculate today once per render to pass to helpers
    const today = new Date();

    // Configure drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px of movement required before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Auth & Filtering state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | number>('');
    const [collectors, setCollectors] = useState<User[]>([]);
    const [loadingCollectors, setLoadingCollectors] = useState(false);

    // Multi-tenancy state
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);

    // States for new actions
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isThermometerInfoOpen, setIsThermometerInfoOpen] = useState(false);
    const [selectedLoanForRenewal, setSelectedLoanForRenewal] = useState<Loan | null>(null);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [selectedLoanForReassign, setSelectedLoanForReassign] = useState<Loan | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<Loan | null>(null);

    const handleOpenDetails = (loan: Loan) => {
        setSelectedLoanForDetails(loan);
        setIsDetailsModalOpen(true);
    };


    // Event Listener for updates (from FabMenu)
    useEffect(() => {
        const handleUpdate = () => {
            loadDashboard(selectedUserId, selectedCompanyId); // Reload with current filter
        };
        window.addEventListener('dashboard-update', handleUpdate);
        return () => window.removeEventListener('dashboard-update', handleUpdate);
    }, [selectedUserId, selectedCompanyId]); // Dependency on selectedUserId and selectedCompanyId is key

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


    const loadDashboard = async (userIdFilter?: string | number, companyId?: string) => {
        const compId = companyId !== undefined ? companyId : selectedCompanyId;
        try {
            setLoading(true);
            const result = await loanService.getDashboardData(userIdFilter, compId);
            setData(result);

            // Apply saved order
            const savedOrder = getCollectionOrder(userIdFilter || 'all');
            const ordered = applySavedOrder<Loan>(result.pendingLoans, savedOrder);
            setOrderedLoans(ordered);
        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError('Error al cargar los datos del dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setOrderedLoans((items) => {
                const oldIndex = items.findIndex((item) => String(item.id) === active.id);
                const newIndex = items.findIndex((item) => String(item.id) === over.id);

                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Save to localStorage
                const loanIds = newOrder.map(loan => loan.id);
                saveCollectionOrder(selectedUserId || 'all', loanIds);

                return newOrder;
            });
        }
    };


    const loadCollectors = async () => {
        try {
            setLoadingCollectors(true);

            const currentUser = authService.getUser();
            let companyFilter = undefined;

            if (currentUser?.profile === 'OWNER') {
                companyFilter = selectedCompanyId;
            } else {
                companyFilter = currentUser?.idCompany;
            }

            // Only fetch if we have a company filter or we don't care (but we care about multi-tenancy)
            if (!companyFilter && currentUser?.profile !== 'OWNER') return; // Should not happen for admin/cobrador

            const allUsers = await userService.getAll(undefined, false, companyFilter);

            // Filter only active collectors
            const activeCollectors = allUsers.filter(u => u.status === 'ACTIVE' && u.profile === 'COBRADOR');
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
        } finally {
            setLoadingCollectors(false);
        }
    };

    const loadCompanies = async () => {
        try {
            const companiesData = await companyService.getAll();
            setCompanies(companiesData);
            if (companiesData.length > 0 && !selectedCompanyId) {
                // Default to empty string for "Todas las empresas"
                setSelectedCompanyId("");
                return "";
            }
            return selectedCompanyId;
        } catch (err) {
            console.error('Failed to load companies');
            return null;
        }
    }

    useEffect(() => {
        const init = async () => {
            const user = authService.getUser();
            setCurrentUser(user);

            // Clean up old orders on mount
            cleanupOldOrders();

            if (user) {
                let companyIdToUse = user.idCompany;

                if (user.profile === 'OWNER') {
                    // If owner, fetch companies and set default
                    const defaultCompanyId = await loadCompanies();
                    if (defaultCompanyId !== null) { // Check for null, as empty string is valid
                        companyIdToUse = defaultCompanyId;
                    }
                } else {
                    setSelectedCompanyId(user.idCompany || '');
                }

                if (user.profile === 'ADMIN' || user.profile === 'OWNER') {
                    loadDashboard('', companyIdToUse);
                    loadCollectors();
                } else {
                    // For COBRADOR, always use their ID
                    setSelectedUserId(user.id);
                    loadDashboard(user.id, companyIdToUse);
                }
            }

            const checkMobile = () => setIsMobile(window.innerWidth < 768);
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        };
        init();

    }, []);

    // Local filtering logic for search
    const filteredLoans = (orderedLoans || []).filter(loan => {
        if (!searchTermLocal.trim()) return true;
        const search = searchTermLocal.toLowerCase();
        return (
            loan.clientName?.toLowerCase().includes(search) ||
            loan.documentNumber?.toLowerCase().includes(search)
        );
    });

    // Effect to reload data when company changes (only for Owner mainly)
    useEffect(() => {
        if (currentUser?.profile === 'OWNER') {
            loadCollectors(); // Reload collectors for new company
            loadDashboard(selectedUserId, selectedCompanyId);
        }
    }, [selectedCompanyId]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedUserId(val);
        loadDashboard(val, selectedCompanyId);
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCompanyId(val);
        // Effect will trigger reload
    };

    // formatMoney is now imported from lib/loanUtils above

    // Sortable Table Row Component
    function SortableTableRow({ loan, index }: { loan: Loan; index: number }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: String(loan.id), disabled: !!searchTermLocal.trim() });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            backgroundColor: isDragging ? 'var(--bg-card)' : 'transparent',
        };

        return (
            <tr ref={setNodeRef} style={{ ...style, borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                            {...attributes}
                            {...listeners}
                            style={{
                                cursor: isDragging ? 'grabbing' : 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary)',
                                touchAction: 'none'
                            }}
                            title="Arrastra para reordenar"
                        >
                            {!searchTermLocal.trim() && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            )}
                        </div>
                        <div style={{
                            minWidth: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                        }}>
                            {index + 1}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{loan.clientName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{loan.documentNumber}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{loan.address}</div>
                        </div>
                    </div>
                </td>
                <td style={{ padding: '1rem' }}>
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
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Cuota:</span>
                            <span>{formatMoney(loan.fee)}</span>
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
                <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                        {formatMoney((loan.amount + loan.interest) - ((loan as any).remainingAmount || 0))}
                    </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }} title={getLoanStatus(loan, today).label}>
                        {getLoanStatus(loan, today).icon}
                    </span>
                </td>
                <td style={{ padding: '1rem' }}>
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
    }

    // Sortable Mobile Card Component
    function SortableMobileCard({ loan, index }: { loan: Loan; index: number }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: String(loan.id), disabled: !!searchTermLocal.trim() });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.7 : 1,
            zIndex: isDragging ? 1000 : 1,
            position: 'relative' as const
        };

        return (
            <div ref={setNodeRef} style={style}>
                <LoanMobileCard
                    loan={loan}
                    index={index}
                    today={today}
                    currentUser={currentUser}
                    onPay={handleOpenPayment}
                    onDetails={handleOpenDetails}
                    onRenew={handleRenewLoan}
                    onReassign={handleOpenReassign}
                    onDelete={handleOpenDelete}
                    shareRef={shareRef}
                    showDragHandle={!searchTermLocal.trim()}
                    dragHandleProps={{ ...attributes, ...listeners }}
                    isDragging={isDragging}
                />
            </div>
        );
    }

    if (loading && !data) return <LoadingSpinner message="Cargando resumen..." />;
    if (error) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>;

    const isAdmin = currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER';
    // const isCobrador = currentUser?.profile === 'COBRADOR'; // checking removed as button is removed

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
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', width: isMobile ? '100%' : 'auto' }}>
                        {currentUser?.profile === 'OWNER' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: isMobile ? '60px' : 'auto' }}>Empresa:</span>
                                <select
                                    className="input"
                                    style={{ padding: '0.6rem 0.8rem', fontSize: '0.875rem', width: isMobile ? '100%' : '200px' }}
                                    value={selectedCompanyId}
                                    onChange={handleCompanyChange}
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: isMobile ? '60px' : 'auto' }}>Cobrador:</span>
                            <select
                                className="input"
                                style={{ padding: '0.4rem', fontSize: '0.875rem', width: isMobile ? '100%' : '200px' }}
                                value={selectedUserId}
                                onChange={handleFilterChange}
                            >
                                <option value="">Todos</option>
                                {collectors.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.username} ({c.firstName} {c.lastName})
                                    </option>
                                ))}
                            </select>
                        </div>
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
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Prestado</h3>
                            <p style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 'bold', color: 'var(--color-primary)', margin: '0.25rem 0' }}><AnimatedNumber value={data.totalLentToday} isCurrency /></p>
                        </div>

                        <div className="card" style={{ padding: 0, display: 'flex', minHeight: isMobile ? '120px' : '160px' }}>
                            {/* Mitad Izquierda */}
                            <div style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'space-between', 
                                alignItems: 'flex-start',
                                padding: isMobile ? '0.75rem' : '1.5rem',
                                borderRight: '1px solid var(--border-color)'
                            }}>
                                <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', margin: 0 }}>Cobrado</h3>
                                <p style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.25rem 0 0 0' }}>
                                    <AnimatedNumber value={data.collectedToday} isCurrency />
                                </p>
                            </div>

                            {/* Mitad Derecha */}
                            <div style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column'
                            }}>
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center', 
                                    alignItems: 'flex-start',
                                    padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Yape</span>
                                    <span style={{ fontSize: isMobile ? '0.95rem' : '1.2rem', fontWeight: 'bold', color: '#2563eb', marginTop: '0.1rem' }}>
                                        <AnimatedNumber value={data.detailCollectedToday?.yape || 0} isCurrency />
                                    </span>
                                </div>
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center', 
                                    alignItems: 'flex-start',
                                    padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem'
                                }}>
                                    <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Efectivo</span>
                                    <span style={{ fontSize: isMobile ? '0.95rem' : '1.2rem', fontWeight: 'bold', color: '#16a34a', marginTop: '0.1rem' }}>
                                        <AnimatedNumber value={data.detailCollectedToday?.efectivo || 0} isCurrency />
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Clientes Activos</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.25rem 0' }}><AnimatedNumber value={data.activeClients} /></p>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Gastos Hoy</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: '#b91c1c', margin: '0.25rem 0' }}><AnimatedNumber value={data.totalExpensesToday || 0} isCurrency /></p>
                        </div>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-start', marginBottom: '0.25rem', gap: '0.4rem' }}>
                                <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', margin: 0 }}>Retorno de Capital</h3>
                                <button 
                                    onClick={() => setIsThermometerInfoOpen(true)}
                                    style={{ 
                                        background: '#eff6ff', 
                                        border: 'none', 
                                        color: '#3b82f6', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        padding: '0.15rem',
                                        borderRadius: '50%'
                                    }}
                                    title="Información del indicador"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="15" height="15">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                    </svg>
                                </button>
                            </div>
                            {data.thermometer !== undefined ? (
                                <div style={{
                                    position: 'relative',
                                    width: isMobile ? '140px' : '180px', // Reducido en móvil
                                    height: isMobile ? '85px' : '110px',  // Reducido en móvil
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    marginTop: '0.5rem'
                                }}>

                                    {/* Text Info (Moved to Top) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        zIndex: 10
                                    }}>
                                        <div style={{
                                            fontSize: isMobile ? '1.25rem' : '1.75rem', // Fuente más pequeña en móvil
                                            fontWeight: '800',
                                            lineHeight: 1,
                                            color: data.thermometer <= 30 ? '#3b82f6' : (data.thermometer <= 70 ? '#ca8a04' : (data.thermometer <= 94 ? '#16a34a' : '#15803d'))
                                        }}>
                                            {Number(data.thermometer).toFixed(0)}%
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? '0.55rem' : '0.65rem',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            marginTop: '2px',
                                            backgroundColor: data.thermometer <= 30 ? '#eff6ff' : (data.thermometer <= 70 ? '#fefce8' : (data.thermometer <= 94 ? '#f0fdf4' : '#dcfce7')),
                                            color: data.thermometer <= 30 ? '#3b82f6' : (data.thermometer <= 70 ? '#ca8a04' : (data.thermometer <= 94 ? '#16a34a' : '#15803d'))
                                        }}>
                                            {data.thermometer <= 30 ? 'Inv. Activa' : (data.thermometer <= 70 ? 'Retorno Cap.' : (data.thermometer <= 94 ? 'Zona Segura' : 'Éxito Total'))}
                                        </div>
                                    </div>

                                    {/* Gauge SVG */}
                                    <svg viewBox="0 0 120 75" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                        {/* Background Track */}
                                        <path
                                            d="M 20 65 A 40 40 0 1 1 100 65"
                                            fill="none"
                                            stroke="#f1f5f9"
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                        />

                                        {/* Dynamic Color Path */}
                                        <path
                                            d="M 20 65 A 40 40 0 1 1 100 65"
                                            fill="none"
                                            stroke={data.thermometer <= 30 ? '#3b82f6' : (data.thermometer <= 70 ? '#eab308' : (data.thermometer <= 94 ? '#22c55e' : '#15803d'))}
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(Math.min(data.thermometer, 100) / 100) * 126}, 200`}
                                        />

                                        {/* Aguja Indicadora */}
                                        <g style={{
                                            transformOrigin: '60px 65px',
                                            transform: `rotate(${(Math.min(data.thermometer, 100) / 100) * 180 - 90}deg)`,
                                            transition: 'transform 0.8s ease-out'
                                        }}>
                                            <polygon points="60,65 56,35 64,35" fill="#1e293b" />
                                            <circle cx="60" cy="65" r="4" fill="#1e293b" />
                                        </g>
                                    </svg>
                                </div>
                            ) : (
                                <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'var(--color-success)', margin: '0.25rem 0' }}>S/ 5,000</p>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        {/* Sticky Header Container */}
                        <div style={{
                            position: 'sticky',
                            top: isMobile ? '4rem' : 0,
                            zIndex: 20,
                            backgroundColor: 'var(--bg-app)',
                            margin: '0 -1rem',
                            padding: '1rem',
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                            }}>
                                <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', margin: 0 }}>
                                    Ruta de Cobro (Hoy) <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 'normal' }}>({filteredLoans.length} pendientes)</span>
                                </h2>
                                <div style={{ width: isMobile ? '100%' : '300px' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Buscar por nombre o DNI..."
                                        value={searchTermLocal}
                                        onChange={(e) => setSearchTermLocal(e.target.value)}
                                        style={{
                                            width: '100%',
                                            backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)',
                                            height: '2.5rem',
                                            fontSize: '0.875rem',
                                            paddingLeft: '1rem'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Status Legend */}
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                flexWrap: 'wrap',
                                backgroundColor: 'var(--bg-card)',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                width: 'fit-content'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🟢</span> <span>Al día (0-1 días)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🟡</span> <span>Mora Leve (2-5 días)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🔴</span> <span>Mora Grave (6+ días)</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem' }}>

                            {orderedLoans.length === 0 ? (
                                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No hay préstamos pendientes para cobrar hoy.
                                </div>
                            ) : isMobile ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={filteredLoans.map(loan => String(loan.id))}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {filteredLoans.map((loan, index) => (
                                                <SortableMobileCard key={loan.id} loan={loan} index={index} />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left' }}>
                                                <tr>
                                                    <th style={{ padding: '1rem' }}>Cliente</th>
                                                    <th style={{ padding: '1rem' }}>Vigencia</th>
                                                    <th style={{ padding: '1rem' }}>Detalle del Préstamo</th>
                                                    <th style={{ padding: '1rem' }}>Pagado</th>
                                                    <th style={{ padding: '1rem' }}>Estado</th>
                                                    <th style={{ padding: '1rem' }}>Acción</th>
                                                </tr>
                                            </thead>
                                            <SortableContext
                                                items={filteredLoans.map(loan => String(loan.id))}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <tbody>
                                                    {filteredLoans.map((loan, index) => (
                                                        <SortableTableRow key={loan.id} loan={loan} index={index} />
                                                    ))}
                                                </tbody>
                                            </SortableContext>
                                        </table>
                                    </div>
                                </DndContext>
                            )}
                        </div>
                    </div>

                    {/* Modals */}
                    <CreatePaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onSuccess={() => {
                            loadDashboard(selectedUserId, selectedCompanyId);
                        }}
                        loan={selectedLoanForPayment}
                    />

                    {
                        selectedLoanForDetails && (
                            <LoanDetailsModal
                                isOpen={isDetailsModalOpen}
                                onClose={() => setIsDetailsModalOpen(false)}
                                loan={selectedLoanForDetails}
                                shareRef={shareRef}
                            />
                        )
                    }
                    {isThermometerInfoOpen && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                            <div className="card" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-app)', borderRadius: '12px', padding: '1.5rem', position: 'relative' }}>
                                <button onClick={() => setIsThermometerInfoOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>Retorno de Capital</h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                                    Este termómetro mide el porcentaje de Retorno de Inversión sobre el capital total prestado históricamente.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.85rem' }}>Inversión Activa</span>
                                            <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '0.85rem' }}>0% - 30%</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>El capital está recién colocado; enfoque en colocación sana.</p>
                                    </div>
                                    <div style={{ padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '8px', borderLeft: '4px solid #eab308' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', color: '#854d0e', fontSize: '0.85rem' }}>Retorno de Capital</span>
                                            <span style={{ fontWeight: 'bold', color: '#ca8a04', fontSize: '0.85rem' }}>31% - 70%</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>Etapa crítica de cobranza para asegurar el punto de equilibrio.</p>
                                    </div>
                                    <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '0.85rem' }}>Zona Segura</span>
                                            <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '0.85rem' }}>71% - 94%</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>Casi todo el capital inicial ha vuelto; los cobros restantes son mayormente utilidad.</p>
                                    </div>
                                    <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', color: '#14532d', fontSize: '0.85rem' }}>Éxito Total</span>
                                            <span style={{ fontWeight: 'bold', color: '#15803d', fontSize: '0.85rem' }}>+95%</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>Has recuperado prácticamente todo lo invertido históricamente.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isCreateModalOpen && (
                        <CreateLoanModal
                            isOpen={isCreateModalOpen}
                            onClose={() => {
                                setIsCreateModalOpen(false);
                                setSelectedLoanForRenewal(null);
                            }}
                            onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
                            loanToRenew={selectedLoanForRenewal}
                        />
                    )}

                    {isReassignModalOpen && selectedLoanForReassign && (
                        <ReassignLoanModal
                            isOpen={isReassignModalOpen}
                            onClose={() => {
                                setIsReassignModalOpen(false);
                                setSelectedLoanForReassign(null);
                            }}
                            onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
                            loan={selectedLoanForReassign}
                        />
                    )}

                    {isDeleteModalOpen && selectedLoanForDelete && (
                        <DeleteLoanConfirmModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => {
                                setIsDeleteModalOpen(false);
                                setSelectedLoanForDelete(null);
                            }}
                            onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
                            loan={selectedLoanForDelete}
                        />
                    )}
                </>
            )}
            <LoanShareGenerator ref={shareRef} />
        </div>
    );
}
