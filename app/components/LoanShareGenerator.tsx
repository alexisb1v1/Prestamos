'use client';

import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { formatDateUTC } from '@/lib/loanUtils';
import { Loan, LoanDetails } from '@/lib/types';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isWithinInterval, getDay, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';

// Helper to manage date caching (simplified from Modal)
let cachedDays: Date[] | null = null;
function getCachedDays(start: Date, end: Date) {
    if (!cachedDays) {
        const now = new Date();
        cachedDays = eachDayOfInterval({
            start: startOfWeek(subMonths(now, 6), { weekStartsOn: 1 }),
            end: endOfWeek(addMonths(now, 6), { weekStartsOn: 1 })
        });
    }
    return cachedDays.filter(day => day >= start && day <= end);
}



// Helper para parsear fechas ISO como UTC sin conversión de zona horaria
function parseISOasUTC(dateString: string): Date {
    const date = new Date(dateString);
    // Crear una fecha local usando los valores UTC para evitar desfase de zona horaria
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export interface LoanShareGeneratorRef {
    shareLoan: (loan: Loan) => Promise<void>;
}

const LoanShareGenerator = forwardRef<LoanShareGeneratorRef, {}>((_, ref) => {
    const [auditData, setAuditData] = useState<{ loan: Loan, details: LoanDetails } | null>(null);
    const [generating, setGenerating] = useState(false);
    const [readyToCapture, setReadyToCapture] = useState(false);

    useImperativeHandle(ref, () => ({
        shareLoan: async (loan: Loan) => {
            console.log('ShareLoan called for:', loan.clientName);
            if (generating) return;

            try {
                setGenerating(true);
                // 1. Fetch Details
                const details = await loanService.getDetails(loan.id);
                setAuditData({ loan, details });
                setReadyToCapture(true); // Signal that data is ready for render & capture
            } catch (err) {
                console.error("Error fetching details for share", err);
                setGenerating(false);
                setAuditData(null);
            }
        }
    }));

    // Effect to trigger capture once data is rendered
    useEffect(() => {
        if (!readyToCapture || !auditData) return;

        const captureImage = async () => {
            // Wait a tick for the DOM to update with new data
            await new Promise(resolve => setTimeout(resolve, 100));

            const container = document.getElementById('loan-share-container');
            const element = document.getElementById('global-loan-share-card');

            if (container && element) {
                try {
                    // Save original styles
                    const originalContainerStyle = container.getAttribute('style') || '';

                    // Make container visible
                    // Make container visible but keep it off-screen
                    container.style.position = 'fixed'; // Keep fixed to avoid scroll issues
                    container.style.top = '-9999px';    // Keep it off-screen vertical
                    container.style.left = '-9999px';   // Keep it off-screen horizontal
                    container.style.zIndex = '-9999';
                    container.style.opacity = '1';      // Needed for capture
                    container.style.visibility = 'visible'; // Needed for capture

                    // Wait for rendering visibility
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const canvas = await html2canvas(element, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false,
                        useCORS: true,
                        allowTaint: true
                    } as any);

                    // Restore original styles
                    container.setAttribute('style', originalContainerStyle);

                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            console.error('Failed to create blob');
                            return;
                        }

                        const { loan } = auditData;
                        const fileName = `Ficha_${loan.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.png`;
                        const file = new File([blob], fileName, { type: 'image/png' });

                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'Ficha de Préstamo',
                                    text: `Detalles del préstamo de ${loan.clientName}`
                                });
                            } catch (e) {
                                console.log('Share cancelled');
                            }
                        } else {
                            const link = document.createElement('a');
                            link.href = canvas.toDataURL('image/png');
                            link.download = fileName;
                            link.click();
                        }

                        // Cleanup
                        const tempCanvases = document.querySelectorAll('canvas[style*="position"][style*="absolute"]');
                        tempCanvases.forEach(c => c.remove());

                        // Reset
                        setReadyToCapture(false);
                        setGenerating(false);
                        setAuditData(null);
                    }, 'image/png');

                } catch (e) {
                    console.error('Error capturing:', e);
                    setReadyToCapture(false);
                    setGenerating(false);
                    setAuditData(null);
                }
            } else {
                console.error('Elements not found for capture');
                setReadyToCapture(false);
                setGenerating(false);
                setAuditData(null);
            }
        };

        captureImage();
    }, [readyToCapture, auditData]);

    if (!auditData) return null;

    const { loan, details } = auditData;

    // --- Render Logic (Copied/Adapted from Modal) ---
    const startDate = parseISOasUTC(details.startDate || loan.startDate);
    const endDate = parseISOasUTC(details.endDate || loan.endDate);

    const calendarStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(endDate, { weekStartsOn: 1 });
    const days = getCachedDays(calendarStart, calendarEnd);

    return (
        <div id="loan-share-container" style={{
            position: 'fixed',
            top: '-9999px',  // Moved far off-screen
            left: '-9999px',
            zIndex: -9999,   // Very low z-index
            opacity: 0,
            pointerEvents: 'none',
            visibility: 'hidden'  // Additional safety
        }}>
            <div id="global-loan-share-card" style={{
                width: '450px',
                backgroundColor: 'white',
                padding: '20px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#1e293b',
                pointerEvents: 'none'  // Explicitly disable on this element too
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#4f46e5' }}>Ficha de Préstamo</h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>Generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Datos del Cliente</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        <div style={{ color: '#64748b' }}>Nombre:</div>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{loan.clientName?.toLowerCase() || 'SIN NOMBRE'}</div>
                        <div style={{ color: '#64748b' }}>Dirección:</div>
                        <div>{loan.address}</div>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Resumen Financiero</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Monto Prestado</span><span style={{ fontWeight: 600 }}>S/ {Number(loan.amount).toFixed(2)}</span></div>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Total a Pagar</span><span style={{ fontWeight: 600 }}>S/ {Number(loan.amount + loan.interest).toFixed(2)}</span></div>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Pagado</span><span style={{ fontWeight: 600, color: '#16a34a' }}>S/ {Number((loan.amount + loan.interest) - ((loan as any).remainingAmount || 0)).toFixed(2)}</span></div>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Restante</span><span style={{ fontWeight: 600, color: '#dc2626' }}>S/ {Number((loan as any).remainingAmount || 0).toFixed(2)}</span></div>
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>Vigencia: </span>
                        {formatDateUTC(details.startDate || loan.startDate)} al {formatDateUTC(details.endDate || loan.endDate)}
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>Calendario de Pagos</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        backgroundColor: '#e2e8f0',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        overflow: 'hidden'
                    }}>
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                            <div key={i + d} style={{ backgroundColor: '#f1f5f9', padding: '4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>{d}</div>
                        ))}
                        {days.map(day => {
                            const dateStr = day.toISOString();
                            const installment = details.installments.find(i => isSameDay(parseISO(i.date), day));
                            const isRelevant = isWithinInterval(day, { start: startDate, end: endDate }) && getDay(day) !== 0;
                            const isStart = isSameDay(startDate, day);
                            const isEnd = isSameDay(endDate, day);
                            const isToday = isSameDay(new Date(), day);

                            // Check for overdue unpaid
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isOverdueUnpaid = isRelevant && day < today && !installment;

                            // Determine background color
                            let bg = 'white';
                            if (installment) {
                                bg = '#63c581ff'; // Green for paid
                            } else if (isOverdueUnpaid) {
                                bg = '#fed7aa'; // Orange for overdue unpaid
                            } else if (isToday && isRelevant) {
                                bg = '#b7d5fdff'; // Darker blue for today
                            } else if (isRelevant) {
                                bg = '#e0f0ff'; // Lighter blue for loan period
                            }

                            return (
                                <div key={dateStr} style={{
                                    height: '50px',
                                    backgroundColor: bg,
                                    padding: '2px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.7rem',
                                    border: isToday && isRelevant && !installment ? '1px solid #3b82f6' : 'none'
                                }}>
                                    <div style={{
                                        fontWeight: isStart || isEnd ? 'bold' : 'normal',
                                        color: isStart ? '#16a34a' : (isEnd ? '#dc2626' : '#64748b')
                                    }}>{format(day, 'd')}</div>

                                    {installment && (
                                        <div style={{ color: '#ffffffff', fontWeight: 'bold', fontSize: '0.65rem' }}>{installment.amount}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', fontSize: '0.7rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '10px', height: '10px', backgroundColor: '#63c581ff', border: '1px solid #1c9641ff', borderRadius: '2px' }}></div>
                            <span>Pagado</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '10px', height: '10px', backgroundColor: '#fed7aa', border: '1px solid #fb923c', borderRadius: '2px' }}></div>
                            <span>Vencido</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '10px', height: '10px', backgroundColor: '#e0f0ff', border: '1px solid #bfdbfe', borderRadius: '2px' }}></div>
                            <span>Préstamo</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '10px', height: '10px', backgroundColor: '#b7d5fdff', border: '1px solid #3b82f6', borderRadius: '2px' }}></div>
                            <span>Hoy</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                    <p style={{ margin: 0 }}>Cuentas Claras - Sistema de Control de Préstamos</p>
                </div>
            </div>
        </div>
    );
});

LoanShareGenerator.displayName = 'LoanShareGenerator';
export default LoanShareGenerator;
