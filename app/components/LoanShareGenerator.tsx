'use client';

import { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import { loanService } from '@/lib/loanService';
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

// Helper para formatear fechas UTC sin desfase de zona horaria
function formatDateUTC(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
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

    useImperativeHandle(ref, () => ({
        shareLoan: async (loan: Loan) => {
            if (generating) return;
            try {
                setGenerating(true);
                // 1. Fetch Details
                const details = await loanService.getDetails(loan.id);
                setAuditData({ loan, details });

                // 2. Wait for Render
                setTimeout(async () => {
                    const element = document.getElementById('global-loan-share-card');
                    if (element) {
                        try {
                            const canvas = await html2canvas(element, {
                                scale: 2,
                                backgroundColor: '#ffffff',
                                logging: false,
                                useCORS: true
                            } as any);

                            canvas.toBlob(async (blob) => {
                                if (!blob) return;
                                const fileName = `Ficha_${loan.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.png`;
                                const file = new File([blob], fileName, { type: 'image/png' });

                                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                                    await navigator.share({
                                        files: [file],
                                        title: 'Ficha de Préstamo',
                                        text: `Detalles del préstamo de ${loan.clientName}`
                                    });
                                } else {
                                    const link = document.createElement('a');
                                    link.href = canvas.toDataURL('image/png');
                                    link.download = fileName;
                                    link.click();
                                }
                                // Cleanup
                                setAuditData(null);
                                setGenerating(false);
                            }, 'image/png');
                        } catch (e) {
                            console.error(e);
                            setGenerating(false);
                            setAuditData(null);
                        }
                    }
                }, 500); // 500ms delay to ensure DOM is ready
            } catch (err) {
                console.error("Error fetching details for share", err);
                setGenerating(false);
                setAuditData(null);
            }
        }
    }));

    if (!auditData) return null;

    const { loan, details } = auditData;

    // --- Render Logic (Copied/Adapted from Modal) ---
    const startDate = parseISOasUTC(details.startDate || loan.startDate);
    const endDate = parseISOasUTC(details.endDate || loan.endDate);

    const calendarStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(endDate, { weekStartsOn: 1 });
    const days = getCachedDays(calendarStart, calendarEnd);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -100, opacity: 0, pointerEvents: 'none' }}>
            <div id="global-loan-share-card" style={{
                width: '450px',
                backgroundColor: 'white',
                padding: '20px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#1e293b'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#4f46e5' }}>Ficha de Préstamo</h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>Generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Datos del Cliente</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        <div style={{ color: '#64748b' }}>Nombre:</div>
                        <div style={{ fontWeight: 600 }}>{loan.clientName}</div>
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

                            let bg = isRelevant ? '#f8fafc' : '#ffffff';
                            if (installment) bg = '#ede9fe';

                            return (
                                <div key={dateStr} style={{
                                    height: '50px',
                                    backgroundColor: bg,
                                    padding: '2px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.7rem'
                                }}>
                                    <div style={{
                                        fontWeight: isStart || isEnd ? 'bold' : 'normal',
                                        color: isStart ? '#16a34a' : (isEnd ? '#dc2626' : '#64748b')
                                    }}>{format(day, 'd')}</div>

                                    {installment && (
                                        <div style={{ color: '#5b21b6', fontWeight: 'bold', fontSize: '0.65rem' }}>{installment.amount}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});

LoanShareGenerator.displayName = 'LoanShareGenerator';
export default LoanShareGenerator;
