'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { loanService } from '@/lib/loanService';
import { authService } from '@/lib/auth';
import styles from './ShareButton.module.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfirmModal from './ConfirmModal';

export default function ShareButton() {
    const [loading, setLoading] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [stats, setStats] = useState<{
        lent: number;
        collected: number;
        activeClients: number;
        user: string;
        detailCollected?: { yape: number; efectivo: number };
    } | null>(null);

    const executeShare = async () => {
        try {
            setShowConfirm(false);
            setLoading(true);

            // 1. Fetch Data
            const currentUser = authService.getUser();
            if (!currentUser) return;

            let userIdFilter = '';
            // If Cobrador, filter by their ID. If Admin, no filter (Global).
            if (currentUser.profile === 'COBRADOR') {
                userIdFilter = String(currentUser.id);
            }

            const data = await loanService.getDashboardData(userIdFilter);

            // 2. Update stats state to render the hidden card
            setStats({
                lent: data.totalLentToday || 0,
                collected: data.collectedToday || 0,
                activeClients: data.activeClients || 0,
                user: currentUser.firstName || currentUser.username,
                detailCollected: data.detailCollectedToday
            });

            // Wait for render (short timeout to ensure DOM is updated with new stats)
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!captureRef.current) return;

            // 3. Generate Image
            const canvas = await html2canvas(captureRef.current, {
                scale: 2, // Higher resolution
                backgroundColor: '#f8fafc',
                logging: false
            });

            const filename = `cierre-${format(new Date(), 'yyyy-MM-dd')}-${currentUser.username}.png`;

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    throw new Error('Error al generar la imagen');
                }

                const file = new File([blob], filename, { type: 'image/png' });

                // 4. Share
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Cierre del Día',
                        text: `Resumen de cobranza - ${format(new Date(), 'dd/MM/yyyy')}`,
                        files: [file]
                    });
                } else {
                    // Fallback for desktop: Download
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = filename;
                    link.click();
                }
            }, 'image/png');

        } catch (error) {
            console.error('Error sharing stats:', error);
            alert('Error al generar o compartir el resumen.');
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount: number) => {
        return `S/ ${Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

    return (
        <>
            <button
                className={styles.fab}
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                aria-label="Cerrar Día"
            >
                {loading ? (
                    <div style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Cerrar Día</span>
                    </>
                )}
            </button>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={executeShare}
                title="¿Cerrar el día?"
                message="¿Estás seguro de que deseas cerrar el día? Esta acción generará el reporte y no permitirá registrar más pagos ni préstamos por hoy."
                confirmText="Sí, cerrar día"
                cancelText="Cancelar"
            />

            {/* Hidden Capture Area */}
            {/* We render it always but "hidden" with stats (or empty if null, but structure exists) */}
            <div className={styles.captureContainer} ref={captureRef}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Resumen Diario</h2>
                        <p className={styles.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
                    </div>

                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Total Prestado</span>
                        <span className={`${styles.statValue} ${styles.totalLent}`}>
                            {stats ? formatMoney(stats.lent) : '...'}
                        </span>
                    </div>

                    <div className={styles.statRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span className={styles.statLabel}>Total Cobrado</span>
                            <span className={`${styles.statValue} ${styles.collected}`}>
                                {stats ? formatMoney(stats.collected) : '...'}
                            </span>
                        </div>
                        {stats?.detailCollected && (
                            <div style={{
                                marginTop: '0.5rem',
                                paddingTop: '0.5rem',
                                borderTop: '1px dashed #e2e8f0',
                                width: '100%',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Yape</span>
                                    <span style={{ fontSize: '1rem', fontWeight: '600', color: '#6366f1' }}>{formatMoney(stats.detailCollected.yape)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Efectivo</span>
                                    <span style={{ fontSize: '1rem', fontWeight: '600', color: '#22c55e' }}>{formatMoney(stats.detailCollected.efectivo)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Clientes Activos</span>
                        <span className={`${styles.statValue} ${styles.clients}`}>
                            {stats ? stats.activeClients : '...'}
                        </span>
                    </div>

                    <div className={styles.footer}>
                        Generado por {stats?.user || 'App Préstamos'}
                    </div>
                </div>

                {/* Branding / Watermark underneath card if desired, or inside card footer */}
            </div>
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
