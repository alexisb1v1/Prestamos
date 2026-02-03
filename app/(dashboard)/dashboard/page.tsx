'use client';

import { useState, useEffect, useRef } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { DashboardData, Loan, User, Company } from '@/lib/types';
import { getLoanStatus, formatDateUTC } from '@/lib/loanUtils';
import CreatePaymentModal from '../../components/CreatePaymentModal';
import LoanDetailsModal from '../../components/LoanDetailsModal';
import LoanShareGenerator, { LoanShareGeneratorRef } from '../../components/LoanShareGenerator';
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

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);

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


    const loadDashboard = async (userIdFilter?: string | number, companyId?: string) => {
        try {
            setLoading(true);
            const result = await loanService.getDashboardData(userIdFilter, companyId);
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
            // Pass selectedCompanyId to filter collectors by company if needed, but currently userService.getAll doesn't support company filter for basic list or assuming it's handled.
            // Actually we updated userService.getAll to accept idCompany.
            // If current user is owner, they might want to see collectors for the selected company.
            // If current user is admin, they see their company's collectors.
            // But here we are fetching ALL users to filter for collectors.
            // Let's rely on userService logic: if I pass idCompany, it filters.

            // NOTE: We need to pass selectedCompanyId ONLY if we are OWNER and have selected one. 
            // If ADMIN, idCompany is in session, userService might not need it passed explicitly if we rely on backend, 
            // BUT we updated userService to use idCompany param.
            // Let's check authService.getUser() again.

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
                    // Load collectors (will use state selectedCompanyId, but state updates are async...)
                    // Better to pass ID directly if possible or wait for next render.
                    // But for simplicity, we call loadDashboard with the ID we just determined.

                    // Note: loadCollectors depends on state selectedCompanyId. 
                    // To avoid race conditions, we might want to wait or pass params.
                    // But since we are inside init async, state updates won't be reflected immediately in `selectedCompanyId` variable read.
                    // However, we can call loadDashboard(selectedUserId, companyIdToUse);

                    // However, we can call loadDashboard(selectedUserId, companyIdToUse);

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

    const formatMoney = (amount: number) => {
        return `S/ ${Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    // Sortable Table Row Component
    function SortableTableRow({ loan, index }: { loan: Loan; index: number }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: String(loan.id) });

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
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
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
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
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
                                color: '#f59e0b'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                                e.currentTarget.style.color = '#d97706';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#f59e0b';
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
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
                                color: '#3b82f6'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                e.currentTarget.style.color = '#2563eb';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#3b82f6';
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                        </button>
                    </div>
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
        } = useSortable({ id: String(loan.id) });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.7 : 1,
            boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : 'none',
            padding: '0rem',
        };

        return (
            <div ref={setNodeRef} style={style} className="card" key={loan.id}>
                <div style={{ padding: '1rem 1rem 0.25rem 1rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        paddingBottom: '0.75rem',
                        marginBottom: '0.75rem',
                        borderBottom: '1px solid var(--border-color)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', flex: 1 }}>
                            <div
                                {...attributes}
                                {...listeners}
                                style={{
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'var(--text-secondary)',
                                    paddingTop: '0.25rem',
                                    touchAction: 'none'
                                }}
                                title="Arrastra para reordenar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </div>
                            <div style={{
                                minWidth: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                flexShrink: 0
                            }}>
                                {index + 1}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{loan.clientName.toLowerCase()}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loan.documentNumber}</div>
                            </div>
                        </div>
                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }} title={getLoanStatus(loan, today).label}>
                            {getLoanStatus(loan, today).icon}
                        </span>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
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
                            {formatMoney(loan.fee)}
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                                {formatMoney(loan.amount + loan.interest)}
                            </span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Restante</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.95rem' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span>Vigencia:</span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)', textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.1rem' }}>
                                    {formatDateUTC(loan.startDate)} - {formatDateUTC(loan.endDate)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.25rem' }}>
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
                                color: '#f59e0b',
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
                                color: '#3b82f6',
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
            </div>
        );
    }

    if (loading && !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando resumen...</div>;
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
                                    style={{ padding: '0.4rem', fontSize: '0.875rem', width: isMobile ? '100%' : '200px' }}
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
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Préstamos Hoy</h3>
                            <p style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 'bold', color: 'var(--color-primary)', margin: '0.25rem 0' }}>{formatMoney(data.totalLentToday)}</p>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Cobrado Hoy</h3>
                            <p style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.25rem 0' }}>{formatMoney(data.collectedToday)}</p>
                            {data.detailCollectedToday && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Yape</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#6366f1' }}>{formatMoney(data.detailCollectedToday.yape)}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Efectivo</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#22c55e' }}>{formatMoney(data.detailCollectedToday.efectivo)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Clientes Activos</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.25rem 0' }}>{data.activeClients}</p>
                        </div>

                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Gastos Hoy</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: '#ef4444', margin: '0.25rem 0' }}>{formatMoney(data.totalExpensesToday || 0)}</p>
                        </div>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.5rem' }}>
                            <h3 className="label" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Meta Diaria</h3>
                            <p style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'var(--color-success)', margin: '0.25rem 0' }}>S/ 5,000</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                        }}>
                            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', margin: 0 }}>
                                Ruta de Cobro (Hoy) <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 'normal' }}>({orderedLoans.length} pendientes)</span>
                            </h2>
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
                                <span>🟢</span> <span>Al día (0-1 días)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>🟡</span> <span>Mora Leve (2-5 días)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>🔴</span> <span>Mora Grave (6+ días)</span>
                            </div>
                        </div>

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
                                    items={orderedLoans.map(loan => String(loan.id))}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {orderedLoans.map((loan, index) => (
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
                                            items={orderedLoans.map(loan => String(loan.id))}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <tbody>
                                                {orderedLoans.map((loan, index) => (
                                                    <SortableTableRow key={loan.id} loan={loan} index={index} />
                                                ))}
                                            </tbody>
                                        </SortableContext>
                                    </table>
                                </div>
                            </DndContext>
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

            {
                selectedLoanForDetails && (
                    <LoanDetailsModal
                        isOpen={isDetailsModalOpen}
                        onClose={() => setIsDetailsModalOpen(false)}
                        loan={selectedLoanForDetails}
                    />
                )
            }
            <LoanShareGenerator ref={shareRef} />
        </div >
    );
}
