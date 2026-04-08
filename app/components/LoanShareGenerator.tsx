'use client';

import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { getLoanDetailsUseCase } from '@/app/features/loans';
import { formatDateUTC, getLoanStatus } from '@/lib/loanUtils';
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
    shareLoan: (loan: Loan, mode?: 'calendar' | 'list') => Promise<void>;
}

const LoanShareGenerator = forwardRef<LoanShareGeneratorRef, {}>((_, ref) => {
    const [auditData, setAuditData] = useState<{ loan: Loan, details: LoanDetails } | null>(null);
    const [generating, setGenerating] = useState(false);
    const [readyToCapture, setReadyToCapture] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    useImperativeHandle(ref, () => ({
        shareLoan: async (loan: Loan, mode: 'calendar' | 'list' = 'calendar') => {
            if (generating) return;

            try {
                setGenerating(true);
                setViewMode(mode);
                // 1. Fetch Details
                const result = await getLoanDetailsUseCase.execute(loan.id.toString());
                
                result.match(
                    (details) => {
                        setAuditData({ loan, details });
                        setReadyToCapture(true); // Signal that data is ready for render & capture
                    },
                    (err) => {
                        console.error("Error fetching details for share", err);
                        setGenerating(false);
                        setAuditData(null);
                    }
                );
            } catch (err) {
                console.error("Unexpected error fetching details", err);
                setGenerating(false);
                setAuditData(null);
            }
        }
    }));
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
                                // Cancelled or failed
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseStartDate = parseISOasUTC(details.startDate || loan.startDate);
    const baseEndDate = parseISOasUTC(details.endDate || loan.endDate);
    
    // Obtener estado detallado usando la utilidad del sistema
    const statusInfo = getLoanStatus(loan, today);
    const isLiquidated = statusInfo.value === 'blue';

    // Extender calendario hasta hoy si NO está liquidado y hoy es después del fin teórico
    let effectiveEnd = !isLiquidated && today > baseEndDate 
        ? today 
        : baseEndDate;

    // Asegurar que se incluyan todos los abonos registrados (incluso fuera de fecha)
    if (details.installments && details.installments.length > 0) {
        details.installments.forEach(inst => {
            const instDate = parseISOasUTC(inst.date);
            if (instDate > effectiveEnd) effectiveEnd = instDate;
        });
    }

    // Forzar que el calendario cubra al menos hasta hoy si hay mora, para que se vea el espacio vacío
    const calendarStart = startOfWeek(baseStartDate, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(effectiveEnd, { weekStartsOn: 1 });
    const days = getCachedDays(calendarStart, calendarEnd);

    // Cálculos dinámicos de progreso
    const remainingAmount = (loan as any).remainingAmount || 0;
    const totalAmount = loan.amount + loan.interest;
    const paidAmount = totalAmount - remainingAmount;
    const totalCuotas = loan.days;
    const paidCuotas = Math.max(0, Math.min(totalCuotas, paidAmount / loan.fee));
    const progress = (paidAmount / totalAmount) * 100;

    return (
        <div id="loan-share-container" style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            zIndex: -9999,
            opacity: 0,
            pointerEvents: 'none',
            visibility: 'hidden'
        }}>
            <div id="global-loan-share-card" style={{
                width: '450px',
                backgroundColor: '#ffffff',
                padding: '24px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#1e293b',
                pointerEvents: 'none',
                borderRadius: '0px',
            }}>
                {/* Header Compacto */}
                <div style={{ textAlign: 'center', marginBottom: '0.75rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h1 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ficha de Préstamo</h1>
                    <p style={{ margin: '0.15rem 0 0 0', color: '#94a3b8', fontSize: '0.7rem' }}>Generado el {format(new Date(), 'dd/MM/yyyy hh:mm a')}</p>
                </div>

                {/* Datos del Cliente y Vigencia */}
                <div style={{ marginBottom: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Información del Cliente</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', textTransform: 'capitalize' }}>{loan.clientName?.toLowerCase()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                {loan.address}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Vigencia</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                                    {format(baseStartDate, 'dd/MM/yy')} - {format(baseEndDate, 'dd/MM/yy')}
                                </div>
                            </div>

                            {/* Badge de Estado Reubicado */}
                            <div style={{ 
                                backgroundColor: statusInfo.color.startsWith('var') ? (statusInfo.value === 'red' ? '#fee2e2' : (statusInfo.value === 'blue' ? '#e0e7ff' : '#fef3c7')) : statusInfo.color + '22',
                                color: statusInfo.color.startsWith('var') ? (statusInfo.value === 'red' ? '#b91c1c' : (statusInfo.value === 'blue' ? '#4338ca' : '#92400e')) : statusInfo.color,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                border: `1px solid ${statusInfo.color.startsWith('var') ? 'transparent' : statusInfo.color + '44'}`,
                                width: 'fit-content'
                            }}>
                                {statusInfo.label.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progreso Visual */}
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'flex-end' }}>
                        <div>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progreso de Pago</span>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>{progress.toFixed(1)}%</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                                {paidCuotas.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}/{totalCuotas} cuotas
                            </span>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '10px' }}></div>
                    </div>
                </div>

                {/* Resumen Financiero en UNA SOLA LÍNEA */}
                <div style={{ 
                    marginBottom: '1rem', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '0.4rem'
                }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '0.5rem', borderRadius: '10px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Prestado</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>S/{Math.round(loan.amount)}</span>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '0.5rem', borderRadius: '10px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.15rem' }}>A Pagar</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>S/{Math.round(totalAmount)}</span>
                    </div>
                    <div style={{ backgroundColor: '#f0fdf4', padding: '0.5rem', borderRadius: '10px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                        <span style={{ color: '#15803d', display: 'block', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Pagado</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>S/{Math.round(paidAmount)}</span>
                    </div>
                    <div style={{ backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '10px', border: '1px solid #fee2e2', textAlign: 'center' }}>
                        <span style={{ color: '#b91c1c', display: 'block', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Saldo</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c' }}>S/{Math.round(remainingAmount)}</span>
                    </div>
                </div>

                {/* Contenido Dinámico: Calendario o Listado */}
                {viewMode === 'calendar' ? (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calendario de Pagos</div>
                            <div style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: '0.9rem', color: '#1e293b' }}>
                                {format(baseStartDate, 'MMMM yyyy', { locale: es })}
                                {format(baseStartDate, 'MMMM yyyy') !== format(effectiveEnd, 'MMMM yyyy') && (
                                    <span style={{ color: '#94a3b8' }}> - {format(effectiveEnd, 'MMMM yyyy', { locale: es })}</span>
                                )}
                            </div>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px',
                            padding: '6px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0'
                        }}>
                            {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map((d, i) => (
                                <div key={i + d} style={{ textAlign: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8' }}>{d}</div>
                            ))}
                            {days.map(day => {
                                const dateStr = day.toISOString();
                                const installment = details.installments.find(i => isSameDay(parseISO(i.date), day));
                                const isOriginalPlan = isWithinInterval(day, { start: baseStartDate, end: baseEndDate }) && getDay(day) !== 0;
                                const isRelevant = isWithinInterval(day, { start: baseStartDate, end: effectiveEnd }) && getDay(day) !== 0;
                                
                                const isStart = isSameDay(baseStartDate, day);
                                const isToday = isSameDay(new Date(), day);

                                const isOverdueUnpaid = isOriginalPlan && day < today && !installment;

                                let bg = 'white';
                                let textColor = '#64748b';
                                let border = '1px solid #f1f5f9';

                                if (installment) {
                                    bg = '#22c55e';
                                    textColor = 'white';
                                    border = 'none';
                                } else if (isOverdueUnpaid) {
                                    bg = '#f97316';
                                    textColor = 'white';
                                    border = 'none';
                                } else if (isToday && isRelevant) {
                                    bg = '#eff6ff';
                                    border = '1.5px solid #3b82f6';
                                    textColor = '#3b82f6';
                                } else if (isRelevant) {
                                    bg = 'white';
                                    border = '1px solid #e2e8f0';
                                    textColor = '#1e293b';
                                } else {
                                    bg = 'transparent';
                                    border = 'none';
                                    textColor = '#cbd5e1';
                                }

                                return (
                                    <div key={dateStr} style={{
                                        height: '42px',
                                        backgroundColor: bg,
                                        borderRadius: '8px',
                                        border: border,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        fontWeight: isRelevant ? 800 : 400,
                                        color: textColor,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <span style={{ fontSize: '0.7rem', opacity: installment ? 0.9 : 1, marginBottom: installment ? '-2px' : '0' }}>{format(day, 'd')}</span>
                                        {installment && (
                                            <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'white' }}>
                                                {installment.amount}
                                            </span>
                                        )}
                                        {isStart && !installment && !isOverdueUnpaid && (
                                            <div style={{ position: 'absolute', top: '2px', right: '2px', width: '4px', height: '4px', backgroundColor: '#4f46e5', borderRadius: '50%' }}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Leyenda Moderna */}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', fontSize: '0.55rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <div style={{ width: '5px', height: '5px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                                <span style={{ fontWeight: 800 }}>PAGADO</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <div style={{ width: '5px', height: '5px', backgroundColor: '#f97316', borderRadius: '50%' }}></div>
                                <span style={{ fontWeight: 800 }}>VENCIDO</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <div style={{ width: '5px', height: '5px', border: '1px solid #e2e8f0', borderRadius: '50%' }}></div>
                                <span style={{ fontWeight: 800 }}>PLAN</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historial de Abonos</div>
                        </div>
                        
                        {details.installments.length > 0 ? (
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '8px',
                                padding: '10px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {details.installments
                                    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                                    .map((inst, idx) => (
                                        <div key={inst.id} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '8px',
                                            border: '1px solid #f1f5f9'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ 
                                                    fontSize: '0.55rem', 
                                                    fontWeight: 900, 
                                                    color: '#6366f1', 
                                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                                    width: '16px',
                                                    height: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '4px'
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>
                                                    {format(parseISO(inst.date), 'dd/MM/yy')}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981' }}>
                                                S/{inst.amount}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '2rem', 
                                backgroundColor: '#f8fafc', 
                                borderRadius: '14px', 
                                border: '1px dashed #cbd5e1',
                                color: '#94a3b8',
                                fontSize: '0.7rem'
                            }}>
                                No se registran pagos realizados.
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Logo */}
                <div style={{ marginTop: '1rem', textAlign: 'center', borderTop: '2px dashed #f1f5f9', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1rem', marginBottom: '0.2rem' }}>Potenciado por</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>
                        Neo<span style={{ color: '#4f46e5' }}>Cobros</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

LoanShareGenerator.displayName = 'LoanShareGenerator';
export default LoanShareGenerator;
