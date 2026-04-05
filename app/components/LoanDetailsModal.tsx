'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';

import { getLoanDetailsUseCase, deleteInstallmentUseCase } from '@/app/features/loans';
import { authService } from '@/lib/auth';
import { formatDateUTC, formatMoney } from '@/lib/loanUtils';
import { Loan, LoanDetails, InstallmentDetail } from '@/lib/types';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isWithinInterval, getDay, addDays, subDays, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { LoanShareGeneratorRef } from './LoanShareGenerator';
import ConfirmModal from './ConfirmModal';
import LoadingSpinner from './LoadingSpinner';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    shareRef?: React.RefObject<LoanShareGeneratorRef | null>;
}


function LoanDetailsModal({ isOpen, onClose, loan, shareRef }: LoanDetailsModalProps) {
    const [details, setDetails] = useState<LoanDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
    const [isMobile, setIsMobile] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const { user, canDeletePayment } = usePermissions();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Confirm Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

    const openConfirmDelete = (paymentId: string) => {
        setPaymentToDelete(paymentId);
        setIsConfirmOpen(true);
    };

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;

        const result = await deleteInstallmentUseCase.execute(paymentToDelete);
        
        result.match(
            () => {
                loadDetails(); // Reload details
                setIsConfirmOpen(false);
                setPaymentToDelete(null);
            },
            (err) => {
                console.error('Error deleting payment:', err);
                alert('Error al eliminar el pago: ' + err.message);
            }
        );
    };

    // Move loadDetails function definition BEFORE useEffect to avoid dependency issues
    const loadDetails = useCallback(async () => {
        if (!loan) return;
        setLoading(true);
        setError('');
        
        const result = await getLoanDetailsUseCase.execute(loan.id.toString());
        
        result.match(
            (data) => setDetails(data),
            (err) => {
                console.error(err);
                setError('Error al cargar los detalles del préstamo.');
            }
        );
        
        setLoading(false);
    }, [loan]);

    useEffect(() => {
        if (isOpen && loan) {
            loadDetails();
            setActiveTab('calendar');
        }
    }, [isOpen, loan, loadDetails]);

    // Memoize utility functions with stable references
    const parseDateTimeSafe = useCallback((dateStr: string) => {
        if (!dateStr) return new Date();
        return new Date(dateStr);
    }, []);

    const parseDateSafe = useCallback((dateStr: string) => {
        if (!dateStr) return new Date();
        const date = new Date(dateStr);
        // Crear una fecha local usando los valores UTC para evitar desfase de zona horaria en fechas tipo DATE
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }, []);

    const formatDateTimePE = useCallback((dateStr: string) => {
        if (!dateStr) return '-';
        return format(parseDateTimeSafe(dateStr), 'dd/MM/yyyy HH:mm');
    }, [parseDateTimeSafe]);

    // Only recalculate when actual date strings change
    const startDateStr = details?.startDate || loan?.startDate || '';
    const endDateStr = details?.endDate || loan?.endDate || '';

    const parsedDates = useMemo(() => {
        if (!startDateStr || !endDateStr) {
            return { start: new Date(), end: new Date() };
        }
        return {
            start: parseDateSafe(startDateStr),
            end: parseDateSafe(endDateStr)
        };
    }, [startDateStr, endDateStr, parseDateSafe]);

    const days = useMemo(() => {
        if (!parsedDates.start || !parsedDates.end) return [];
        return eachDayOfInterval({ 
            start: startOfWeek(parsedDates.start, { weekStartsOn: 1 }), 
            end: endOfWeek(parsedDates.end, { weekStartsOn: 1 }) 
        });
    }, [parsedDates.start, parsedDates.end]);

    const monthLabel = useMemo(() => {
        if (format(parsedDates.start, 'MMM yyyy') === format(parsedDates.end, 'MMM yyyy')) {
            return format(parsedDates.start, 'MMMM yyyy', { locale: es });
        }
        return `${format(parsedDates.start, 'MMMM', { locale: es })} - ${format(parsedDates.end, 'MMMM yyyy', { locale: es })}`;
    }, [parsedDates.start, parsedDates.end]);

    const getInstallmentForDay = useCallback((day: Date) => {
        // Normalizamos 'day' a solo fecha local para la comparación
        const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());

        return details?.installments?.find(inst => {
            const instDate = new Date(inst.date);
            const instDay = new Date(instDate.getFullYear(), instDate.getMonth(), instDate.getDate());
            return instDay.getTime() === normalizedDay.getTime();
        });
    }, [details?.installments]);

    const isLoanDate = useCallback((day: Date) => {
        const withinInterval = isWithinInterval(day, { start: parsedDates.start, end: parsedDates.end });
        const isSunday = getDay(day) === 0;
        return withinInterval && !isSunday;
    }, [parsedDates.start, parsedDates.end]);

    const isStartDate = useCallback((day: Date) => isSameDay(parsedDates.start, day), [parsedDates.start]);
    const isEndDate = useCallback((day: Date) => isSameDay(parsedDates.end, day), [parsedDates.end]);
    const isToday = useCallback((day: Date) => isSameDay(new Date(), day), []);

    const isPaymentDeleteable = useCallback((paymentDateStr: string, registeredByUserId?: string) => {
        return canDeletePayment(paymentDateStr, registeredByUserId);
    }, [canDeletePayment]);

    // Conditional return AFTER all hooks
    if (!isOpen || !loan) return null;

    const handleShare = async () => {
        if (loan && shareRef?.current) {
            setIsSharing(true);
            try {
                await shareRef.current.shareLoan(loan);
            } catch (error) {
                console.error("Error al compartir ficha:", error);
            } finally {
                setIsSharing(false);
            }
        }
    };

    return (
        <>
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
                zIndex: 1000,
                padding: '0.5rem'
            }}>
                <div className="card" style={{
                    width: '100%',
                    maxWidth: '650px',
                    maxHeight: '94vh',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    padding: '0.85rem'
                }}>
                    {/* Modal Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '0.15rem',
                        padding: '0 0.25rem'
                    }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Detalle de Pagos</h2>
                        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                            <button
                                onClick={handleShare}
                                disabled={isSharing}
                                title="Compartir Ficha"
                                style={{
                                    padding: '0.4rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: isSharing ? 'wait' : 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isSharing ? (
                                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" opacity="0.6">
                                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                                        </circle>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                )}
                            </button>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>

                    {/* Compact Summary Card */}
                    <div style={{
                        padding: '0.5rem 0.85rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: '0.75rem',
                        color: 'white',
                        boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.2)',
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: '0.1rem',
                        flexShrink: 0
                    }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Cliente</div>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0', textTransform: 'capitalize' }}>
                                        {loan.clientName?.toLowerCase() || 'SIN NOMBRE'}
                                    </h3>
                                </div>
                                <div style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                                    padding: '0.25rem 0.6rem', 
                                    borderRadius: '2rem',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    border: '1px solid rgba(255, 255, 255, 0.3)'
                                }}>
                                    {formatDateUTC(details?.startDate || loan.startDate)} - {formatDateUTC(details?.endDate || loan.endDate)}
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.15)', margin: '0.4rem 0' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{ width: '26px', height: '26px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.5rem', opacity: 0.8, fontWeight: 600 }}>Total</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{formatMoney(loan.amount + (loan.interest || 0))}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{ width: '26px', height: '26px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.5rem', opacity: 0.8, fontWeight: 600 }}>Cuota</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{formatMoney(loan.fee || 0)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '2px',
                        padding: '3px',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: '0.6rem',
                        border: '1px solid var(--border-color)',
                        flexShrink: 0,
                        marginBottom: '0.1rem'
                    }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '0.45rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                backgroundColor: activeTab === 'calendar' ? 'white' : 'transparent',
                                color: activeTab === 'calendar' ? '#4f46e5' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setActiveTab('calendar')}
                        >
                            Calendario
                        </button>
                        <button
                            style={{
                                flex: 1,
                                padding: '0.45rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                backgroundColor: activeTab === 'list' ? 'white' : 'transparent',
                                color: activeTab === 'list' ? '#4f46e5' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setActiveTab('list')}
                        >
                            Listado
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                    }}>
                        {loading ? (
                            <LoadingSpinner message="Cargando detalles..." />
                        ) : error ? (
                            <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>
                        ) : activeTab === 'calendar' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                {/* Calendar Header */}
                                <div style={{ textAlign: 'center', padding: '0.1rem 0' }}>
                                    <span style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                        {monthLabel}
                                    </span>
                                </div>

                                {/* Calendar Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gap: '3px',
                                    backgroundColor: 'transparent',
                                    position: 'relative',
                                    padding: '0.1rem'
                                }}>
                                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(d => (
                                        <div key={d} style={{
                                            padding: '0.1rem 0',
                                            textAlign: 'center',
                                            fontSize: '0.6rem',
                                            fontWeight: 800,
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {d}
                                        </div>
                                    ))}

                                    {days.map(day => {
                                        const installment = getInstallmentForDay(day);
                                        const isRelevant = isLoanDate(day);
                                        const isStart = isStartDate(day);
                                        const isEnd = isEndDate(day);
                                        const isTodayDate = isToday(day);

                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isOverdueUnpaid = isRelevant && day < today && !installment;
                                        
                                        let bgColor = '#f8fafc'; 
                                        let textColor = 'var(--text-secondary)';
                                        let amountColor = '#64748b';
                                        
                                        if (installment) {
                                            bgColor = '#eff9f1'; 
                                            textColor = '#16a34a';
                                            amountColor = '#16a34a';
                                        } else if (isOverdueUnpaid) {
                                            bgColor = '#fff7ed'; 
                                            textColor = '#ea580c';
                                            amountColor = '#ea580c';
                                        } else if (isTodayDate && isRelevant) {
                                            bgColor = '#ecf3ff'; 
                                            textColor = '#4f46e5';
                                            amountColor = '#4f46e5';
                                        } else if (isRelevant) {
                                            bgColor = '#f0f9ff'; 
                                            textColor = '#0369a1';
                                            amountColor = '#0369a1';
                                        }

                                        if (isStart) {
                                            bgColor = '#4f46e5';
                                            textColor = 'white';
                                            amountColor = 'white';
                                        } else if (isEnd) {
                                            bgColor = '#f43f5e';
                                            textColor = 'white';
                                            amountColor = 'white';
                                        }

                                        return (
                                            <div key={day.toISOString()} style={{
                                                minHeight: isMobile ? '42px' : '54px',
                                                padding: '2px',
                                                backgroundColor: bgColor,
                                                borderRadius: '0.45rem',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: (isTodayDate && isRelevant && !isStart && !isEnd) ? '1px solid #4f46e5' : 'none'
                                            }}>
                                                <div style={{
                                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                    fontWeight: 800,
                                                    color: textColor,
                                                    lineHeight: 1,
                                                    marginBottom: (isStart || isEnd) ? '1px' : '0'
                                                }}>
                                                    {format(day, 'd')}
                                                </div>

                                                {(isStart || isEnd) && (
                                                    <div style={{
                                                        fontSize: '0.45rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        lineHeight: 1
                                                    }}>
                                                        {isStart ? 'Inicio' : 'Fin'}
                                                    </div>
                                                )}

                                                <div style={{ 
                                                    fontSize: isMobile ? '0.5rem' : '0.6rem', 
                                                    fontWeight: 700, 
                                                    color: amountColor,
                                                    opacity: (isStart || isEnd) ? 1 : 0.9,
                                                    lineHeight: 1
                                                }}>
                                                    {isRelevant ? (loan.fee || 0).toFixed(0) : ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Compact Legend */}
                                <div style={{ 
                                    marginTop: '0.4rem', 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '0.2rem 0.5rem', 
                                    fontSize: '0.65rem', 
                                    padding: '0 0.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pago OK</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#f97316', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Atrasado</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#6366f1', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Próximo</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#cbd5e1', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Sin Cuota</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* List View */
                            <div style={{ padding: '0 0.25rem' }}>
                                {!details?.installments.length ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', opacity: 0.7, fontSize: '0.9rem' }}>
                                        No hay pagos registrados.
                                    </div>
                                ) : (
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '0.6rem',
                                        maxHeight: '400px',
                                        overflowY: 'auto'
                                    }}>
                                        {[...details.installments]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((inst, idx) => {
                                                const canDelete = isPaymentDeleteable(inst.date, inst.registeredByUserId);
                                                return (
                                                    <div key={idx} style={{
                                                        padding: '0.75rem 1rem',
                                                        backgroundColor: 'var(--bg-app)',
                                                        borderRadius: '0.75rem',
                                                        border: '1px solid var(--border-color)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '8px',
                                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                                color: '#22c55e',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                                    {formatMoney(inst.amount)}
                                                                </div>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                                    {formatDateTimePE(inst.date)} • {inst.registeredBy}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => openConfirmDelete(inst.id)}
                                                                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', cursor: 'pointer' }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto', padding: '0.25rem 0.25rem 0' }}>
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cerrar Detalle
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDeletePayment}
                title="Eliminar Pago"
                message="¿Estás seguro de que deseas eliminar este pago?"
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />
        </>
    );
}

export default memo(LoanDetailsModal);
