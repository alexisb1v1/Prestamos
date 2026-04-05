'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDashboardDataUseCase, DashboardData, Loan } from '@/app/features/loans';
import { userService } from '@/lib/userService';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { User, Company } from '@/lib/types';
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
import CollectionRouteCard from '../../components/CollectionRouteCard';
import DashboardFilterModal from '../../components/DashboardFilterModal';
import UpdateLoanInfoModal from '../../components/UpdateLoanInfoModal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    MouseSensor,
    TouchSensor,
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
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10, // 10px of movement required
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // Long press requirement for mobile
                tolerance: 5, // Allow 5px of movement during delay
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Auth & Filtering state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
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
    const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<Loan | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isUpdateInfoModalOpen, setIsUpdateInfoModalOpen] = useState(false);
    const [selectedLoanForUpdateInfo, setSelectedLoanForUpdateInfo] = useState<Loan | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Debounce timer for saving order to backend
    const saveOrderTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        
        const handleOpenFilters = () => setIsFilterModalOpen(true);
        const filterBtn = document.getElementById('open-filters-btn');
        if (filterBtn) filterBtn.onclick = handleOpenFilters;

        return () => {
            window.removeEventListener('dashboard-update', handleUpdate);
        };
    }, [selectedUserId, selectedCompanyId]);

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

    const handleOpenUpdateInfo = (loan: Loan) => {
        setSelectedLoanForUpdateInfo(loan);
        setIsUpdateInfoModalOpen(true);
    };

    const handleUpdateInfoSuccess = () => {
        loadDashboard(selectedUserId, selectedCompanyId);
    };

    const handleOpenDelete = (loan: Loan) => {
        setSelectedLoanForDelete(loan);
        setIsDeleteModalOpen(true);
    };


    const loadDashboard = async (userIdFilter?: string, companyId?: string) => {
        const compId = companyId !== undefined ? companyId : selectedCompanyId;
        try {
            setLoading(true);
            const result = await getDashboardDataUseCase.execute(userIdFilter, compId);
            
            result.match(
                (data) => {
                    setData(data);
                    // Apply saved order: Priority 1: LocalStorage, Priority 2: User profile (Backend)
                    let savedOrder = getCollectionOrder(userIdFilter || 'all');
                    
                    if (!savedOrder && currentUser?.collectionOrder) {
                        savedOrder = currentUser.collectionOrder;
                    }

                    const ordered = applySavedOrder<Loan>(data.pendingLoans, savedOrder);
                    setOrderedLoans(ordered);
                },
                (err) => {
                    console.error('Error loading dashboard:', err);
                    setError('Error al cargar los datos del dashboard.');
                }
            );
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

                // 1. Save to localStorage (instant)
                const loanIds = newOrder.map(loan => String(loan.id));
                saveCollectionOrder(selectedUserId || 'all', loanIds);
                
                // 2. Persist to Backend with Debounce (small delay)
                if (saveOrderTimerRef.current) clearTimeout(saveOrderTimerRef.current);
                
                saveOrderTimerRef.current = setTimeout(async () => {
                    try {
                        console.log('Sincronizando orden con el backend...');
                        const response = await userService.updateCollectionOrder(loanIds);
                        
                        if (response.success) {
                            // Update the User object in session/localStorage so the order is remembered
                            authService.updateUser({ collectionOrder: loanIds });
                        }
                    } catch (err) {
                        console.error('Error al sincronizar el orden con el backend:', err);
                    }
                }, 800); // 800ms debounce

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
                <CollectionRouteCard
                    loan={loan}
                    index={index}
                    today={today}
                    currentUser={currentUser}
                    onPay={handleOpenPayment}
                    onDetails={handleOpenDetails}
                    onUpdateInfo={handleOpenUpdateInfo}
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

    return (
        <div>
            {isAdmin && (
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
                        {selectedUserId ? collectors.find(c => c.id === selectedUserId)?.username : 'Todos los cobradores'}
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
            }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>Resumen</h1>
                {isAdmin && (
                    <button 
                        onClick={() => setIsFilterModalOpen(true)}
                        style={{
                            width: '36px', height: '36px', borderRadius: '0.75rem',
                            background: 'white', border: '1.5px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#64748b',
                            position: 'relative',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        title="Filtros de Vista"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        {(selectedCompanyId || selectedUserId) && (
                            <div style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>
                        )}
                    </button>
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
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '0.75rem'
                    }}>
                        {/* Main Minimal Stat Card */}
                        <div className="card" style={{
                            gridColumn: isMobile ? 'span 1' : 'span 2',
                            padding: '1.15rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.85rem'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cobrado Hoy</div>
                                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1e293b', marginTop: '0.1rem' }}>
                                    <AnimatedNumber value={data.collectedToday} isCurrency />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                                <div style={{ 
                                    backgroundColor: '#f5f3ff', 
                                    borderRadius: '0.9rem',
                                    padding: '0.7rem 0.8rem',
                                    border: '1.5px solid #ede9fe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    flex: 1
                                }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '0.45rem', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>YAPE</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {formatMoney(data.detailCollectedToday?.yape || 0).replace('S/ ', 'S/')}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ 
                                    backgroundColor: '#f0fdf4', 
                                    borderRadius: '0.9rem',
                                    padding: '0.7rem 0.8rem',
                                    border: '1.5px solid #dcfce7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    flex: 1
                                }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '0.45rem', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>EFECTIVO</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {formatMoney(data.detailCollectedToday?.efectivo || 0).replace('S/ ', 'S/')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Cards Grid */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gridColumn: isMobile ? 'span 1' : 'span 2',
                            gap: '0.75rem' 
                        }}>
                            <div className="card" style={{ padding: '0.9rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Prestado</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                        {formatMoney(data.totalLentToday).replace('S/ ', 'S/')}
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '0.9rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Clientes</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{data.activeClients}</div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '0.9rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fff1f2', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Gastos Hoy</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                        {formatMoney(data.totalExpensesToday || 0).replace('S/ ', 'S/')}
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '0.9rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <button 
                                    onClick={() => setIsThermometerInfoOpen(true)}
                                    style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '0.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 5
                                    }}
                                    title="Más información"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </button>
                                <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getThermometerColor(data.thermometer || 0)} strokeWidth="3" strokeDasharray={`${data.thermometer || 0}, 100`} strokeLinecap="round" />
                                    </svg>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{Math.round(data.thermometer || 0)}%</span>
                                    </div>
                                </div>
                                <div style={{ marginLeft: '0.6rem', flex: 1 }}>
                                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: getThermometerColor(data.thermometer || 0), textTransform: 'uppercase', lineHeight: 1.1 }}>
                                        {getThermometerLabel(data.thermometer || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                        {/* Sticky Header Container */}
                        <div style={{
                            position: 'sticky',
                            top: isMobile ? '4rem' : '0.5rem',
                            zIndex: 20,
                            backgroundColor: 'white',
                            margin: '0',
                            padding: '0.85rem 1rem',
                            borderRadius: '1.25rem',
                            border: '2px solid #f1f5f9',
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.55rem'
                            }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                    Ruta de Cobro
                                </h2>
                                <div style={{
                                    backgroundColor: '#fff1f2',
                                    color: '#f43f5e',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '2rem',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    border: '1px solid #ffe4e6'
                                }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {filteredLoans.length} PENDIENTES
                                </div>
                            </div>
                            
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Nombre o DNI..."
                                    value={searchTermLocal}
                                    onChange={(e) => setSearchTermLocal(e.target.value)}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#f8fafc',
                                        height: '2.4rem',
                                        fontSize: '0.85rem',
                                        paddingLeft: '2.5rem',
                                        borderRadius: '0.85rem',
                                        border: '1.5px solid #e2e8f0',
                                        color: '#1e293b',
                                        boxShadow: isMobile ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                />
                                <div style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '0.75rem' }}>

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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                        {filteredLoans.map((loan, index) => (
                                            <SortableMobileCard key={loan.id} loan={loan} index={index} />
                                        ))}
                                    </div>
                                </DndContext>
                            )}

                            <DashboardFilterModal 
                                isOpen={isFilterModalOpen}
                                onClose={() => setIsFilterModalOpen(false)}
                                companies={companies}
                                collectors={collectors}
                                selectedCompanyId={selectedCompanyId}
                                onCompanyChange={setSelectedCompanyId}
                                selectedUserId={selectedUserId}
                                onUserChange={setSelectedUserId}
                                onApply={() => loadDashboard(selectedUserId, selectedCompanyId)}
                                isOwner={currentUser?.profile === 'OWNER'}
                                isAdmin={currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER'}
                            />
                        </div>
                    </div>

                    {/* All Global Modals */}
                    <CreatePaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onSuccess={() => {
                            loadDashboard(selectedUserId, selectedCompanyId);
                        }}
                        loan={selectedLoanForPayment}
                    />

                    <LoanDetailsModal
                        isOpen={isDetailsModalOpen}
                        onClose={() => setIsDetailsModalOpen(false)}
                        loan={selectedLoanForDetails}
                        shareRef={shareRef}
                    />

                    <CreateLoanModal
                        isOpen={isCreateModalOpen}
                        onClose={() => {
                            setIsCreateModalOpen(false);
                            setSelectedLoanForRenewal(null); // Reset
                        }}
                        onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
                        loanToRenew={selectedLoanForRenewal}
                    />

                    <ReassignLoanModal
                        isOpen={isReassignModalOpen}
                        onClose={() => {
                            setIsReassignModalOpen(false);
                            setSelectedLoanForReassign(null);
                        }}
                        onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
                        loan={selectedLoanForReassign}
                    />

                    <DeleteLoanConfirmModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setSelectedLoanForDelete(null);
                        }}
                        onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
                        loan={selectedLoanForDelete}
                    />

                    <ThermometerInfoModal 
                        isOpen={isThermometerInfoOpen} 
                        onClose={() => setIsThermometerInfoOpen(false)} 
                    />
                    
                    {/* Componente invisible para generar imágenes de compartir */}
                    <LoanShareGenerator ref={shareRef} />

                    {isUpdateInfoModalOpen && selectedLoanForUpdateInfo && (
                        <UpdateLoanInfoModal
                            loan={selectedLoanForUpdateInfo}
                            onClose={() => {
                                setIsUpdateInfoModalOpen(false);
                                setSelectedLoanForUpdateInfo(null);
                            }}
                            onSuccess={handleUpdateInfoSuccess}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function getThermometerColor(percentage: number) {
    if (percentage <= 30) return '#3b82f6'; // Blue - Inversión Activa
    if (percentage <= 70) return '#f59e0b'; // Yellow/Orange - Retorno de Capital
    if (percentage <= 94) return '#22c55e'; // Green - Zona Segura
    return '#10b981'; // Darker Green - Éxito Total
}

function getThermometerLabel(percentage: number) {
    if (percentage <= 30) return 'Inversión Activa';
    if (percentage <= 70) return 'Retorno de Capital';
    if (percentage <= 94) return 'Zona Segura';
    return 'Éxito Total';
}

function ThermometerInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)', padding: '1.5rem',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '1.5rem', padding: '1.5rem',
                maxWidth: '420px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Retorno de Capital</h3>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                    Este termómetro mide el porcentaje de Retorno de Inversión sobre el capital total prestado históricamente.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Inversión Activa */}
                    <div style={{ 
                        padding: '0.85rem 1rem', borderRadius: '0.85rem', borderLeft: '4px solid #3b82f6', 
                        backgroundColor: '#eff6ff', display: 'flex', flexDirection: 'column', gap: '0.2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem' }}>Inversión Activa</span>
                            <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.85rem' }}>0% - 30%</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', lineHeight: 1.4 }}>El capital está recién colocado; enfoque en colocación sana.</div>
                    </div>

                    {/* Retorno de Capital */}
                    <div style={{ 
                        padding: '0.85rem 1rem', borderRadius: '0.85rem', borderLeft: '4px solid #f59e0b', 
                        backgroundColor: '#fffbeb', display: 'flex', flexDirection: 'column', gap: '0.2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.9rem' }}>Retorno de Capital</span>
                            <span style={{ fontWeight: 700, color: '#d97706', fontSize: '0.85rem' }}>31% - 70%</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#b45309', lineHeight: 1.4 }}>Etapa crítica de cobranza para asegurar el punto de equilibrio.</div>
                    </div>

                    {/* Zona Segura */}
                    <div style={{ 
                        padding: '0.85rem 1rem', borderRadius: '0.85rem', borderLeft: '4px solid #22c55e', 
                        backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: '0.2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#166534', fontSize: '0.9rem' }}>Zona Segura</span>
                            <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.85rem' }}>71% - 94%</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#15803d', lineHeight: 1.4 }}>Casi todo el capital inicial ha vuelto; los cobros restantes son mayormente utilidad.</div>
                    </div>

                    {/* Éxito Total */}
                    <div style={{ 
                        padding: '0.85rem 1rem', borderRadius: '0.85rem', borderLeft: '4px solid #10b981', 
                        backgroundColor: '#f0fdf9', display: 'flex', flexDirection: 'column', gap: '0.2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#065f46', fontSize: '0.9rem' }}>Éxito Total</span>
                            <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>+95%</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#047857', lineHeight: 1.4 }}>Has recuperado prácticamente todo lo invertido históricamente.</div>
                    </div>
                </div>

                <button onClick={onClose} style={{
                    width: '100%', marginTop: '1.25rem', padding: '0.85rem',
                    backgroundColor: '#1e293b', color: 'white', borderRadius: '0.85rem',
                    border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer'
                }}>
                    Entendido
                </button>
            </div>
        </div>
    );
}
