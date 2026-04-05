'use client';

import { useState, useEffect } from 'react';
import { Loan, User } from '@/lib/types';
import { getLoanStatus } from '@/lib/loanUtils';
import { usePermissions } from '@/hooks/usePermissions';
import { LoanShareGeneratorRef } from './LoanShareGenerator';

interface LoanActionsProps {
    loan: Loan;
    currentUser: User | null;
    isMobile: boolean;
    today: Date;
    onPay: (loan: Loan) => void;
    onDetails: (loan: Loan) => void;
    onRenew: (loan: Loan) => void;
    onReassign: (loan: Loan) => void;
    onDelete: (loan: Loan) => void;
    shareRef: React.RefObject<LoanShareGeneratorRef | null>;
    minimal?: boolean;
}

export default function LoanActions({
    loan,
    currentUser,
    isMobile,
    today,
    onPay,
    onDetails,
    onRenew,
    onReassign,
    onDelete,
    shareRef,
    minimal = false
}: LoanActionsProps) {
    const [activeMenu, setActiveMenu] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!shareRef.current) return;
        setIsSharing(true);
        try {
            await shareRef.current.shareLoan(loan);
        } catch (error) {
            console.error("Error al compartir ficha:", error);
        } finally {
            setIsSharing(false);
            setActiveMenu(false);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        if (!activeMenu) return;
        const handleClickOutside = () => setActiveMenu(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    const status = getLoanStatus(loan, today);
    const { canDeleteLoan, canReassignLoan, canRenewLoan } = usePermissions();

    const isPaid = loan.status === 'Liquidado' || (loan as any).remainingAmount <= 0;

    // Desktop view logic (horizontal buttons)
    if (!isMobile) {
        const canPay = loan.inIntervalPayment !== 0 || status.value !== 'green';
        const hasBalance = (loan.remainingAmount || 0) > 0;
        const isActionEnabled = canPay && hasBalance;

        return (
            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', position: 'relative' }}>
                {loan.status === 'Liquidado' && canRenewLoan ? (
                    <button
                        onClick={() => onRenew(loan)}
                        title="Renovar Préstamo"
                        className="btn-icon"
                        style={{ color: 'var(--color-primary)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => isActionEnabled && onPay(loan)}
                        disabled={!isActionEnabled}
                        title={!hasBalance ? 'Pagado' : (!canPay ? 'Restringido' : 'Registrar Pago')}
                        style={{
                            padding: '0.35rem',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: !isActionEnabled ? 'not-allowed' : 'pointer',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: !isActionEnabled ? '#94a3b8' : '#22c55e',
                            opacity: !isActionEnabled ? 0.5 : 1
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                    </button>
                )}

                <button
                    onClick={() => onDetails(loan)}
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
                        color: '#f59e0b'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                <button
                    onClick={handleShare}
                    disabled={isSharing}
                    title="Compartir Ficha"
                    style={{
                        padding: '0.35rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: isSharing ? 'wait' : 'pointer',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6',
                        opacity: isSharing ? 0.6 : 1,
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
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                    )}
                </button>

                {/* More options button for Desktop */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(!activeMenu);
                    }}
                    title="Más opciones"
                    style={{
                        padding: '0.35rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                </button>

                {/* Submenu for Desktop */}
                {activeMenu && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        minWidth: '150px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '0.25rem'
                    }}>
                        {canReassignLoan && (
                            <button
                                onClick={() => {
                                    onReassign(loan);
                                    setActiveMenu(false);
                                }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: '#8b5cf6',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Reasignar
                            </button>
                        )}

                        {canDeleteLoan && (
                            <button
                                onClick={() => {
                                    onDelete(loan);
                                    setActiveMenu(false);
                                }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: 'var(--color-danger)',
                                    fontSize: '0.85rem',
                                    borderTop: canReassignLoan ? '1px solid var(--border-color)' : 'none'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                Eliminar
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Mobile view logic (More menu)
    return (
        <div style={{
            display: 'flex',
            gap: '0.25rem',
            paddingTop: '0.5rem',
            position: 'relative',
            width: minimal ? 'auto' : '100%',
            justifyContent: minimal ? 'center' : 'space-between',
            marginTop: minimal ? '0' : '0.5rem',
            borderTop: minimal ? 'none' : '1px solid var(--border-color)',
        }}>
            {!minimal && (
                <>
                    {loan.status === 'Liquidado' && canRenewLoan ? (
                        <button
                            onClick={() => onRenew(loan)}
                            style={{
                                padding: '0.5rem 0.25rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-primary)',
                                flex: 1
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>Renovar</span>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                const canPay = loan.inIntervalPayment !== 0 || status.value !== 'green';
                                const hasBalance = (loan.remainingAmount || 0) > 0;
                                if (canPay && hasBalance) onPay(loan);
                            }}
                            disabled={!((loan.inIntervalPayment !== 0 || status.value !== 'green') && (loan.remainingAmount || 0) > 0)}
                            style={{
                                padding: '0.5rem 0.25rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: !((loan.inIntervalPayment !== 0 || status.value !== 'green') && (loan.remainingAmount || 0) > 0) ? '#94a3b8' : '#22c55e',
                                opacity: !((loan.inIntervalPayment !== 0 || status.value !== 'green') && (loan.remainingAmount || 0) > 0) ? 0.5 : 1,
                                flex: 1
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                </svg>
                                <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>Pagar</span>
                            </div>
                        </button>
                    )}

                    <button
                        onClick={() => onDetails(loan)}
                        style={{
                            padding: '0.5rem 0.25rem',
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>Detalles</span>
                        </div>
                    </button>
                </>
            )}

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(!activeMenu);
                }}
                style={{
                    padding: '0.5rem 0.25rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    flex: 1
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                    <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>Más</span>
                </div>
            </button>

            {activeMenu && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: '0',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100,
                    minWidth: '150px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '0.5rem'
                }}>
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        style={{
                            padding: '0.75rem 1rem',
                            border: 'none',
                            backgroundColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            cursor: isSharing ? 'wait' : 'pointer',
                            textAlign: 'left',
                            color: '#3b82f6',
                            fontSize: '0.85rem',
                            opacity: isSharing ? 0.6 : 1,
                        }}
                    >
                        {isSharing ? (
                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" opacity="0.6">
                                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                        )}
                        {isSharing ? 'Generando...' : 'Compartir'}
                    </button>

                    {canReassignLoan && (
                        <>
                            <button
                                onClick={() => {
                                    onReassign(loan);
                                    setActiveMenu(false);
                                }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: '#8b5cf6',
                                    fontSize: '0.85rem',
                                    borderTop: '1px solid var(--border-color)'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Reasignar
                            </button>
                        </>
                    )}

                    {canDeleteLoan && (
                        <button
                            onClick={() => {
                                onDelete(loan);
                                setActiveMenu(false);
                            }}
                            style={{
                                padding: '0.75rem 1rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                color: 'var(--color-danger)',
                                fontSize: '0.85rem',
                                borderTop: '1px solid var(--border-color)'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Eliminar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
