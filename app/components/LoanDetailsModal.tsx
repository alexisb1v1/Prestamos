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

    // const formatDatePE = useCallback((dateStr: string) => {
    //     if (!dateStr) return '-';
    //     return format(parseDateSafe(dateStr), 'dd/MM/yyyy');
    // }, [parseDateSafe]);

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
                padding: '1rem'
            }}>
                <div className="card" style={{
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '95vh',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    padding: '1rem'
                }}>
                    {/* Modal Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '0.4rem',
                        padding: '0 0.25rem'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Detalle de Pagos</h2>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <button
                                onClick={handleShare}
                                disabled={isSharing}
                                title="Compartir Ficha"
                                style={{
                                    padding: '0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: isSharing ? 'wait' : 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isSharing ? (
                                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" opacity="0.6">
                                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                                        </circle>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                )}
                            </button>
                            <button 
                                onClick={onClose} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>

                    {/* Premium Summary Card */}
                    <div style={{
                        padding: '0.85rem 1rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: '1rem',
                        color: 'white',
                        boxShadow: '0 8px 20px -5px rgba(99, 102, 241, 0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: '0.5rem'
                    }}>
                        {/* Decorative Circle */}
                        <div style={{
                            position: 'absolute',
                            top: '-20%',
                            right: '-10%',
                            width: '150px',
                            height: '150px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            zIndex: 0
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0', textTransform: 'capitalize' }}>
                                        {loan.clientName?.toLowerCase() || 'SIN NOMBRE'}
                                    </h3>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 500 }}>ID: #{loan.id}</div>
                                </div>
                                <div style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                                    padding: '0.35rem 0.75rem', 
                                    borderRadius: '2rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    border: '1px solid rgba(255, 255, 255, 0.3)'
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {formatDateUTC(details?.startDate || loan.startDate)} - {formatDateUTC(details?.endDate || loan.endDate)}
                                </div>
                            </div>

                            <div style={{ 
                                height: '1px', 
                                background: 'rgba(255, 255, 255, 0.2)', 
                                margin: '0.6rem 0' 
                            }} />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.8, fontWeight: 600 }}>Total</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{formatMoney(loan.amount + (loan.interest || 0))}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.8, fontWeight: 600 }}>Cuota</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{formatMoney(loan.fee || 0)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Segmented Picker */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '4px',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: '0.85rem',
                        border: '1px solid var(--border-color)',
                        flexShrink: 0,
                        marginBottom: '0.5rem'
                    }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                borderRadius: '0.65rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                backgroundColor: activeTab === 'calendar' ? 'white' : 'transparent',
                                boxShadow: activeTab === 'calendar' ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' : 'none',
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
                                padding: '0.6rem',
                                borderRadius: '0.65rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                backgroundColor: activeTab === 'list' ? 'white' : 'transparent',
                                boxShadow: activeTab === 'list' ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' : 'none',
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
                        paddingRight: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        {loading ? (
                            <LoadingSpinner message="Cargando detalles..." />
                        ) : error ? (
                            <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>
                        ) : activeTab === 'calendar' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {/* Calendar Header - Show range description */}
                                <div style={{ textAlign: 'center', padding: '0.25rem 0', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                        {monthLabel}
                                    </span>
                                </div>

                                {/* Calendar Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gap: '6px',
                                    backgroundColor: 'transparent',
                                    position: 'relative',
                                    padding: '0.25rem'
                                }}>
                                    {/* Days of week */}
                                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(d => (
                                        <div key={d} style={{
                                            padding: '0.25rem 0',
                                            textAlign: 'center',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            color: 'var(--text-secondary)',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {d}
                                        </div>
                                    ))}

                                    {/* Calendar Days */}
                                    {days.map(day => {
                                        const installment = getInstallmentForDay(day);
                                        const isRelevant = isLoanDate(day);
                                        const isStart = isStartDate(day);
                                        const isEnd = isEndDate(day);
                                        const isTodayDate = isToday(day);

                                        // Month indicator if day is 1st of month
                                        const isFirstOfMonth = format(day, 'd') === '1';

                                        // Check if it's an overdue unpaid day (before today, no payment, within loan period)
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isOverdueUnpaid = isRelevant && day < today && !installment;                                        // Determine background color and text colors
                                        let bgColor = '#f8fafc'; // Neutral background for non-loan days
                                        let textColor = 'var(--text-secondary)';
                                        let amountColor = '#64748b';
                                        
                                        if (installment) {
                                            bgColor = '#eff9f1'; // Light Green
                                            textColor = '#16a34a';
                                            amountColor = '#16a34a';
                                        } else if (isOverdueUnpaid) {
                                            bgColor = '#fff7ed'; // Light Orange
                                            textColor = '#ea580c';
                                            amountColor = '#ea580c';
                                        } else if (isTodayDate && isRelevant) {
                                            bgColor = '#ecf3ff'; // Light Blue/Indigo
                                            textColor = '#4f46e5';
                                            amountColor = '#4f46e5';
                                        } else if (isRelevant) {
                                            bgColor = '#f0f9ff'; // Very light blue
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
                                                minHeight: isMobile ? '52px' : '85px',
                                                padding: '6px 2px',
                                                backgroundColor: bgColor,
                                                borderRadius: '0.75rem',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'transform 0.2s',
                                                boxShadow: (isStart || isEnd) ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                                border: (isTodayDate && isRelevant && !isStart && !isEnd) ? '1px solid #4f46e5' : 'none'
                                            }}>
                                                <div style={{
                                                    fontSize: isMobile ? '0.9rem' : '1rem',
                                                    fontWeight: 800,
                                                    color: textColor,
                                                    marginBottom: '2px'
                                                }}>
                                                    {format(day, 'd')}
                                                </div>

                                                {(isStart || isEnd) && (
                                                    <div style={{
                                                        fontSize: '0.55rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        marginTop: '-2px',
                                                        marginBottom: '2px'
                                                    }}>
                                                        {isStart ? 'Inicio' : 'Fin'}
                                                    </div>
                                                )}

                                                <div style={{ 
                                                    fontSize: isMobile ? '0.6rem' : '0.75rem', 
                                                    fontWeight: 700, 
                                                    color: amountColor,
                                                    opacity: (isStart || isEnd) ? 1 : 0.9
                                                }}>
                                                    {isRelevant ? (isMobile ? (loan.fee || 0).toFixed(0) : (loan.fee || 0).toFixed(0)) : ''}
                                                </div>

                                                {isTodayDate && isRelevant && !isStart && !isEnd && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        right: '4px',
                                                        width: '5px',
                                                        height: '5px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#4f46e5'
                                                    }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ 
                                    marginTop: '0.5rem', 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.5rem 1rem', 
                                    fontSize: '0.7rem', 
                                    padding: '0 0.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pago Registrado</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '10px', height: '10px', backgroundColor: '#f97316', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Sin Pago (Vencido)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '10px', height: '10px', backgroundColor: '#6366f1', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Próximo / Inicio</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '10px', height: '10px', backgroundColor: '#cbd5e1', borderRadius: '50%' }}></div>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Sin Cuota</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Modern List View */
                            <div style={{ padding: '0 0.5rem' }}>
                                {!details?.installments.length ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                        No hay pagos registrados.
                                    </div>
                                ) : (
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '1rem',
                                        maxHeight: '450px',
                                        overflowY: 'auto',
                                        paddingRight: '4px'
                                    }}>
                                        {[...details.installments]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((inst, idx) => {
                                                const canDelete = isPaymentDeleteable(inst.date, inst.registeredByUserId);
                                                return (
                                                    <div key={idx} style={{
                                                        padding: '1.25rem',
                                                        backgroundColor: 'var(--bg-app)',
                                                        borderRadius: '1.25rem',
                                                        border: '1px solid var(--border-color)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                    }}>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                            <div style={{
                                                                width: '44px',
                                                                height: '44px',
                                                                borderRadius: '14px',
                                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                                color: '#22c55e',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                                    {formatMoney(inst.amount)}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <span>{formatDateTimePE(inst.date)}</span>
                                                                    <span style={{ opacity: 0.8 }}>Cobrador: {inst.registeredBy}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {(user?.profile === 'ADMIN' || user?.profile === 'OWNER' || user?.profile === 'COBRADOR') && (
                                                            <div>
                                                                {canDelete ? (
                                                                    <button
                                                                        onClick={() => openConfirmDelete(inst.id)}
                                                                        title="Eliminar Pago"
                                                                        style={{
                                                                            padding: '0.75rem',
                                                                            borderRadius: '0.75rem',
                                                                            border: 'none',
                                                                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                                                            color: '#ef4444',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                                    </button>
                                                                ) : (
                                                                    <div title={user?.profile === 'COBRADOR' ? "Solo pagos del día" : "Periodo expirado"} style={{
                                                                        padding: '0.75rem',
                                                                        color: '#cbd5e1',
                                                                        opacity: 0.5
                                                                    }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto', padding: '0.5rem 0.5rem 0' }}>
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '1rem',
                                border: '2px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                                e.currentTarget.style.borderColor = 'var(--text-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
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
                message="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />
        </>
    );
}

// Export with React.memo to prevent unnecessary re-renders
export default memo(LoanDetailsModal);
