'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { authService } from '@/lib/auth';
import styles from './FabMenu.module.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfirmModal from './ConfirmModal';
import CreateLoanModal from './CreateLoanModal';
import CreateExpenseModal from './CreateExpenseModal';
import { useRouter } from 'next/navigation';

export default function FabMenu() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // ... stats state ...

    // New Loan Logic
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

    // Expense Logic
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    // Day Close Logic
    const captureRef = useRef<HTMLDivElement>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [stats, setStats] = useState<{
        lent: number;
        collected: number;
        expenses: number;
        activeClients: number;
        user: string;
        detailCollected?: { yape: number; efectivo: number };
    } | null>(null);



    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isOpen && !(e.target as Element).closest(`.${styles.fabContainer}`)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isOpen]);

    const executeShare = async () => {
        try {
            setShowConfirm(false);
            setLoading(true);

            // 1. Fetch Data
            const currentUser = authService.getUser();
            if (!currentUser) return;

            let userIdFilter = '';
            if (currentUser.profile === 'COBRADOR') {
                userIdFilter = String(currentUser.id);
            }

            const data = await loanService.getDashboardData(userIdFilter);

            // 2. Update stats state
            setStats({
                lent: data.totalLentToday || 0,
                collected: data.collectedToday || 0,
                expenses: data.totalExpensesToday || 0,
                activeClients: data.activeClients || 0,
                user: currentUser.firstName || currentUser.username,
                detailCollected: data.detailCollectedToday
            });

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!captureRef.current) return;

            // 3. Generate Image
            const canvas = await html2canvas(captureRef.current, {
                scale: 2,
                backgroundColor: '#f8fafc',
                logging: false
            } as any);

            const filename = `cierre-${format(new Date(), 'yyyy-MM-dd')}-${currentUser.username}.png`;

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Error al generar la imagen');
                const file = new File([blob], filename, { type: 'image/png' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Cierre del Día',
                        text: `Resumen de cobranza - ${format(new Date(), 'dd/MM/yyyy')}`,
                        files: [file]
                    });
                } else {
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = filename;
                    link.click();
                }
            }, 'image/png');

            // 4. API Call & Logout
            await userService.toggleDayStatus(String(currentUser.id), true);
            authService.logout();
            router.push('/login');

        } catch (error) {
            console.error('Error sharing stats:', error);
            alert('Error al generar o compartir el resumen.');
        } finally {
            setLoading(false);
            setIsOpen(false);
        }
    };

    const formatMoney = (amount: number) => {
        return `S/ ${Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

    return (
        <>
            <div className={styles.fabContainer}>

                {/* Actions (stacked bottom-up) */}
                <div className={`${styles.menuItem} ${isOpen ? styles.visible : ''}`} style={{ transitionDelay: isOpen ? '0.1s' : '0s' }}>
                    <span className={styles.label}>Cerrar Día</span>
                    <button
                        className={`${styles.menuFab} ${styles.actionClose}`}
                        onClick={() => setShowConfirm(true)}
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                </div>

                <div className={`${styles.menuItem} ${isOpen ? styles.visible : ''}`} style={{ transitionDelay: isOpen ? '0.05s' : '0.05s' }}>
                    <span className={styles.label}>Nuevo Préstamo</span>
                    <button
                        className={`${styles.menuFab} ${styles.actionLoan}`}
                        onClick={() => {
                            setIsLoanModalOpen(true);
                            setIsOpen(false);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>

                <div className={`${styles.menuItem} ${isOpen ? styles.visible : ''}`} style={{ transitionDelay: isOpen ? '0.1s' : '0.05s' }}>
                    <span className={styles.label}>Registrar Gasto</span>
                    <button
                        className={`${styles.menuFab}`}
                        style={{ color: '#ef4444' }}
                        onClick={() => {
                            setIsExpenseModalOpen(true);
                            setIsOpen(false);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </button>
                </div>

                {/* Main FAB */}
                <button
                    className={`${styles.mainFab} ${isOpen ? styles.open : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Menu de acciones"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            {/* Modals */}
            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={executeShare}
                title="¿Cerrar el día?"
                message="¿Estás seguro de que deseas cerrar el día? Esta acción generará el reporte y no permitirá registrar más pagos ni préstamos por hoy."
                confirmText="Sí, cerrar día"
                cancelText="Cancelar"
            />

            <CreateLoanModal
                isOpen={isLoanModalOpen}
                onClose={() => setIsLoanModalOpen(false)}
                onSuccess={() => {
                    // Dispatch Global Event to update Dashboard if visible
                    window.dispatchEvent(new Event('dashboard-update'));
                }}
            />

            <CreateExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSuccess={() => {
                    window.dispatchEvent(new Event('dashboard-update'));
                }}
            />

            {/* Hidden Capture Area */}
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

                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Total Gastos</span>
                        <span className={`${styles.statValue}`} style={{ color: '#ef4444' }}>
                            {stats ? formatMoney(stats.expenses) : '...'}
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
            </div>
        </>
    );
}
