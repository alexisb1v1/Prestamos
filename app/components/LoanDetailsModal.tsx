'use client';

import { useState, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { Loan, LoanDetails, InstallmentDetail } from '@/lib/types';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isWithinInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
}

export default function LoanDetailsModal({ isOpen, onClose, loan }: LoanDetailsModalProps) {
    const [details, setDetails] = useState<LoanDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

    useEffect(() => {
        if (isOpen && loan) {
            loadDetails();
            setActiveTab('calendar');
        }
    }, [isOpen, loan]);

    const loadDetails = async () => {
        if (!loan) return;
        setLoading(true);
        setError('');
        try {
            const data = await loanService.getDetails(loan.id);
            setDetails(data);
        } catch (err: any) {
            console.error(err);
            setError('Error al cargar los detalles del préstamo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !loan) return null;

    const parseDateTimeSafe = (dateStr: string) => {
        if (!dateStr) return new Date();
        return parseISO(dateStr);
    };

    const parseDateSafe = (dateStr: string) => {
        if (!dateStr) return new Date();
        // Only keep YYYY-MM-DD to avoid timezone shifts from time components
        const justDate = dateStr.split('T')[0];
        return parseISO(justDate);
    };

    const formatDatePE = (dateStr: string) => {
        if (!dateStr) return '-';
        return format(parseDateSafe(dateStr), 'dd/MM/yyyy');
    };

    const formatDateTimePE = (dateStr: string) => {
        if (!dateStr) return '-';
        return format(parseDateTimeSafe(dateStr), 'dd/MM/yyyy HH:mm');
    };

    // Calendar logic: show the entire duration from start to end
    const getCalendarRange = () => {
        const startRaw = details?.startDate || loan.startDate;
        const endRaw = details?.endDate || loan.endDate;
        const start = startOfWeek(parseDateSafe(startRaw), { weekStartsOn: 1 });
        const end = endOfWeek(parseDateSafe(endRaw), { weekStartsOn: 1 });
        return { start, end };
    };

    const { start: calendarStart, end: calendarEnd } = getCalendarRange();

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const getMonthLabel = () => {
        const start = parseDateSafe(details?.startDate || loan.startDate);
        const end = parseDateSafe(details?.endDate || loan.endDate);
        if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
            return format(start, 'MMMM yyyy', { locale: es });
        }
        return `${format(start, 'MMMM', { locale: es })} - ${format(end, 'MMMM yyyy', { locale: es })}`;
    };

    const getInstallmentForDay = (day: Date) => {
        return details?.installments.find(inst => isSameDay(parseDateTimeSafe(inst.date), day));
    };

    const isLoanDate = (day: Date) => {
        const start = parseDateSafe(details?.startDate || loan.startDate);
        const end = parseDateSafe(details?.endDate || loan.endDate);
        const withinInterval = isWithinInterval(day, { start, end });
        const isSunday = getDay(day) === 0;
        return withinInterval && !isSunday;
    };

    const isStartDate = (day: Date) => isSameDay(parseDateSafe(details?.startDate || loan.startDate), day);
    const isEndDate = (day: Date) => isSameDay(parseDateSafe(details?.endDate || loan.endDate), day);

    return (
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
                overflowY: 'auto',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Detalle de Pagos</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem'
                }}>
                    <div style={{ fontWeight: 'bold' }}>Cliente: {loan.clientName}</div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        <div style={{ color: 'var(--text-secondary)' }}>ID Préstamo: #{loan.id}</div>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                            {formatDatePE(details?.startDate || loan.startDate)} - {formatDatePE(details?.endDate || loan.endDate)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Monto:</span> S/ {Number(loan.amount).toFixed(2)}</div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Cuota:</span> S/ {Number(loan.fee || 0).toFixed(2)}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    padding: '0.25rem',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                }}>
                    <button
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'calc(var(--radius-md) - 2px)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            backgroundColor: activeTab === 'calendar' ? 'white' : 'transparent',
                            boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            color: activeTab === 'calendar' ? 'var(--color-primary)' : 'var(--text-secondary)'
                        }}
                        onClick={() => setActiveTab('calendar')}
                    >
                        Calendario
                    </button>
                    <button
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'calc(var(--radius-md) - 2px)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            backgroundColor: activeTab === 'list' ? 'white' : 'transparent',
                            boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            color: activeTab === 'list' ? 'var(--color-primary)' : 'var(--text-secondary)'
                        }}
                        onClick={() => setActiveTab('list')}
                    >
                        Listado
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalles...</div>
                ) : error ? (
                    <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>
                ) : activeTab === 'calendar' ? (
                    <>
                        {/* Calendar Header - Show range description */}
                        <div style={{ textAlign: 'center', padding: '0.25rem 0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 'bold', textTransform: 'capitalize', fontSize: '1.1rem' }}>
                                {getMonthLabel()}
                            </span>
                        </div>

                        {/* Calendar Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '2px',
                            backgroundColor: 'var(--border-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {/* Days of week - Sticky Header */}
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                                <div key={d} style={{
                                    backgroundColor: 'var(--bg-app)',
                                    padding: '0.5rem 0',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: 'var(--text-secondary)',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 10,
                                    borderBottom: '1px solid var(--border-color)'
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

                                // Month indicator if day is 1st of month
                                const isFirstOfMonth = format(day, 'd') === '1';

                                return (
                                    <div key={day.toISOString()} style={{
                                        minHeight: '85px',
                                        padding: '4px',
                                        backgroundColor: isRelevant ? '#eff6ff' : 'white',
                                        position: 'relative',
                                        border: isRelevant ? '1px solid #bfdbfe' : 'none',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                            marginBottom: '2px'
                                        }}>
                                            <span style={{
                                                fontSize: '0.6rem',
                                                color: 'var(--text-secondary)',
                                                textTransform: 'uppercase',
                                                fontWeight: 'bold'
                                            }}>
                                                {isFirstOfMonth ? format(day, 'MMM', { locale: es }) : ''}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: isStart || isEnd ? 'bold' : 'normal',
                                                color: isStart || isEnd ? 'var(--color-primary)' : 'inherit',
                                            }}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>

                                        {isStart && (
                                            <div style={{
                                                fontSize: '0.55rem',
                                                backgroundColor: '#dcfce7',
                                                color: '#166534',
                                                padding: '1px 2px',
                                                borderRadius: '2px',
                                                marginBottom: '2px',
                                                textAlign: 'center',
                                                fontWeight: 'bold'
                                            }}>INICIO</div>
                                        )}

                                        {isEnd && (
                                            <div style={{
                                                fontSize: '0.55rem',
                                                backgroundColor: '#fee2e2',
                                                color: '#991b1b',
                                                padding: '1px 2px',
                                                borderRadius: '2px',
                                                marginBottom: '2px',
                                                textAlign: 'center',
                                                fontWeight: 'bold'
                                            }}>FIN</div>
                                        )}

                                        {installment && (
                                            <div style={{
                                                marginTop: 'auto',
                                                padding: '6px 2px',
                                                backgroundColor: '#ede9fe',
                                                borderRadius: '4px',
                                                border: '1px solid #c4b5fd',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#5b21b6', lineHeight: '1.2' }}>
                                                    S/ {installment.amount}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <div style={{ width: '12px', height: '12px', backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '2px' }}></div>
                                <span>Pago Registrado</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <div style={{ width: '12px', height: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '2px' }}></div>
                                <span>Periodo de Préstamo</span>
                            </div>
                        </div>
                    </>
                ) : (
                    /* List View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {!details?.installments.length ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                No hay pagos registrados.
                            </div>
                        ) : (
                            <div style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Fecha y Hora</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monto</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cobrador</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...details.installments]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((inst, idx) => (
                                                <tr key={idx} style={{ borderBottom: idx < details.installments.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                    <td style={{ padding: '0.75rem' }}>{formatDateTimePE(inst.date)}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                        S/ {Number(inst.amount).toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{inst.registeredBy}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    <button className="btn" style={{ width: '100%', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }} onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
