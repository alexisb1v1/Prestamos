'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { getLoanDetailsUseCase, deleteInstallmentUseCase } from '@/app/features/loans';
import { authService } from '@/lib/auth';
import { formatDateUTC, formatMoney, getLoanStatus } from '@/lib/loanUtils';
import { Loan, LoanDetails, InstallmentDetail } from '@/lib/types';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isWithinInterval, getDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { LoanShareGeneratorRef } from './LoanShareGenerator';
import ConfirmModal from './ConfirmModal';
import LoadingSpinner from './LoadingSpinner';
import { logger } from '@/lib/logging-service';

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
    const { canDeletePayment } = usePermissions();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const loadDetails = useCallback(async () => {
        if (!loan) return;
        setLoading(true);
        setError('');
        
        const result = await getLoanDetailsUseCase.execute(loan.id.toString());
        
        result.match(
            (data) => setDetails(data),
            (err) => {
                logger.error('Error loading loan details:', err);
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

    const parseDateSafe = useCallback((dateStr: string) => {
        if (!dateStr) return new Date();
        const date = new Date(dateStr);
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }, []);

    const startDateStr = details?.startDate || loan?.startDate || '';
    const endDateStr = details?.endDate || loan?.endDate || '';

    const parsedDates = useMemo(() => {
        if (!startDateStr || !endDateStr) {
            return { start: new Date(), end: new Date() };
        }
        
        const start = parseDateSafe(startDateStr);
        let end = parseDateSafe(endDateStr);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isLiquidated = loan?.status === 'Liquidado';

        if (!isLiquidated && today > end) {
            end = today;
        }

        if (details?.installments && details.installments.length > 0) {
            details.installments.forEach(inst => {
                const instDate = parseDateSafe(inst.date);
                if (instDate > end) end = instDate;
            });
        }

        return { start, end };
    }, [startDateStr, endDateStr, parseDateSafe, loan?.status, details?.installments]);

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
        const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        return details?.installments?.find(inst => {
            const instDate = new Date(inst.date);
            const instDay = new Date(instDate.getFullYear(), instDate.getMonth(), instDate.getDate()).getTime();
            return instDay === normalizedDay;
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

    const handleShare = async () => {
        if (loan && shareRef?.current) {
            setIsSharing(true);
            try {
                await shareRef.current.shareLoan(loan, activeTab);
            } catch (error) {
                logger.error("Error al compartir ficha:", error);
            } finally {
                setIsSharing(false);
            }
        }
    };

    const openConfirmDelete = (paymentDate: string) => {
        setPaymentToDelete(paymentDate);
        setIsConfirmOpen(true);
    };

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;

        const result = await deleteInstallmentUseCase.execute(paymentToDelete);
        
        result.match(
            () => {
                loadDetails();
                setIsConfirmOpen(false);
                setPaymentToDelete(null);
            },
            (err) => {
                logger.error('Error deleting payment:', err);
                alert('Error al eliminar el pago: ' + err.message);
            }
        );
    };

    if (!isOpen || !loan) return null;

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
                        marginBottom: '0.2rem',
                        flexShrink: 0
                    }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Cliente</div>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 900, backgroundColor: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: '4px' }}>
                                            ID: #{loan.id}
                                        </div>
                                    </div>
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

                            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.45rem 0' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                                {/* Total */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <div style={{ fontSize: '0.45rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Total</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{formatMoney(loan.amount + (loan.interest || 0))}</div>
                                </div>
                                {/* Cuota */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <div style={{ fontSize: '0.45rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Cuota</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{formatMoney(loan.fee || 0)}</div>
                                </div>
                                {/* Saldo */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <div style={{ fontSize: '0.45rem', color: '#fef08a', fontWeight: 700, textTransform: 'uppercase' }}>Saldo</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fef08a' }}>{formatMoney(loan.remainingAmount || 0)}</div>
                                </div>
                                {/* Estado */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.45rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Días</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900 }}>
                                        {(() => {
                                            const s = getLoanStatus(loan, new Date()) as any;
                                            if (s.value === 'red') return `${s.overdueDays}d Mora`;
                                            if (s.value === 'blue') return 'Lqd';
                                            const start = parseDateSafe(loan.startDate);
                                            const end = parseDateSafe(loan.endDate);
                                            const today = new Date();
                                            today.setHours(0,0,0,0);
                                            const total = differenceInDays(end, start);
                                            const current = differenceInDays(today, start);
                                            return `${Math.max(0, current)}/${total}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
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
                                fontSize: '0.8rem',
                                fontWeight: '800',
                                backgroundColor: activeTab === 'calendar' ? 'white' : 'transparent',
                                color: activeTab === 'calendar' ? '#4f46e5' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                                fontSize: '0.8rem',
                                fontWeight: '800',
                                backgroundColor: activeTab === 'list' ? 'white' : 'transparent',
                                color: activeTab === 'list' ? '#4f46e5' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setActiveTab('list')}
                        >
                            Historial
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '0.2rem 0'
                    }}>
                        {loading ? (
                            <LoadingSpinner message="Cargando..." />
                        ) : activeTab === 'calendar' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                <div style={{ textAlign: 'center', paddingBottom: '0.4rem' }}>
                                    <span style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                        {monthLabel}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gap: '4px',
                                    padding: '2px'
                                }}>
                                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(d => (
                                        <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{d}</div>
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
                                        
                                        let bgColor = 'var(--bg-app)';
                                        let textColor = 'var(--text-secondary)';
                                        
                                        if (installment) { bgColor = '#eff9ed'; textColor = '#15803d'; }
                                        else if (isOverdueUnpaid) { bgColor = '#fef2f2'; textColor = '#b91c1c'; }
                                        else if (isRelevant) { bgColor = '#f0f9ff'; textColor = '#0369a1'; }
                                        
                                        if (isStart) { bgColor = '#4f46e5'; textColor = 'white'; }
                                        else if (isEnd) { bgColor = '#f43f5e'; textColor = 'white'; }

                                        return (
                                            <div key={day.toISOString()} style={{
                                                aspectRatio: '1',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: bgColor,
                                                borderRadius: '0.5rem',
                                                border: isTodayDate ? '1.5px solid #4f46e5' : 'none',
                                                opacity: isRelevant || installment ? 1 : 0.4
                                            }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: textColor }}>{format(day, 'd')}</span>
                                                {isRelevant && !isStart && !isEnd && (
                                                    <span style={{ fontSize: '0.45rem', fontWeight: 700, opacity: 0.8, color: textColor }}>
                                                        {loan.fee?.toFixed(0)}
                                                    </span>
                                                )}
                                                {(isStart || isEnd) && (
                                                    <span style={{ fontSize: '0.4rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                        {isStart ? 'Ini' : 'Fin'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* Flat History List Grid */
                            <div style={{ padding: '0 0.2rem' }}>
                                {!details?.installments.length ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay abonos aún.</div>
                                ) : (() => {
                                    const sorted = [...details.installments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                    return (
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(2, 1fr)', 
                                            gap: '6px' 
                                        }}>
                                            {sorted.map((inst, idx) => (
                                                <div key={inst.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.4rem 0.6rem',
                                                    backgroundColor: 'var(--bg-app)',
                                                    borderRadius: '0.6rem',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                                                            {sorted.length - idx}
                                                        </span>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{format(parseISO(inst.date), 'dd/MM/yyyy')}</span>
                                                            <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{format(parseISO(inst.date), 'hh:mm a')}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#16a34a' }}>S/{inst.amount}</span>
                                                        {canDeletePayment(inst.date, inst.registeredByUserId) && (
                                                            <button 
                                                                onClick={() => openConfirmDelete(inst.date)}
                                                                style={{ padding: '4px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar
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
