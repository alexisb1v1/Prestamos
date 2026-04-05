'use client';

import React from 'react';
import { Loan, User } from '@/lib/types';
import { getLoanStatus, formatDateUTC, formatMoney } from '@/lib/loanUtils';
import LoanActions from './LoanActions';
import { LoanShareGeneratorRef } from './LoanShareGenerator';

interface LoanMobileCardProps {
    loan: Loan;
    today: Date;
    currentUser: User | null;
    index?: number;
    // Handlers
    onPay: (loan: Loan) => void;
    onDetails: (loan: Loan) => void;
    onRenew: (loan: Loan) => void;
    onReassign: (loan: Loan) => void;
    onDelete: (loan: Loan) => void;
    shareRef: React.RefObject<LoanShareGeneratorRef | null>;
    
    // Optional Sortable Props
    dragHandleProps?: any;
    isDragging?: boolean;
    showDragHandle?: boolean;
}

export default function LoanMobileCard({
    loan,
    today,
    currentUser,
    index,
    onPay,
    onDetails,
    onRenew,
    onReassign,
    onDelete,
    shareRef,
    dragHandleProps,
    isDragging,
    showDragHandle = false
}: LoanMobileCardProps) {
    const status = getLoanStatus(loan, today);

    return (
        <div 
            className="card" 
            style={{ 
                padding: '0rem',
                opacity: isDragging ? 0.7 : 1,
                boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.1)' : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
            }}
        >
            <div style={{ padding: '1.25rem 1.25rem 1rem 1.25rem' }}>
                {/* Header: Client Info + Status Indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.25rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {showDragHandle && dragHandleProps && (
                            <div {...dragHandleProps} style={{ color: 'var(--text-secondary)', cursor: 'grab' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            </div>
                        )}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.1rem' }}>
                                {loan.clientName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                                {loan.documentNumber || 'Sin Documento'}
                            </div>
                        </div>
                    </div>
                    <span style={{ fontSize: '0.75rem' }} title={status.label}>{status.icon}</span>
                </div>

                {/* Main Content: Plan de Pago vs Pendiente */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                    padding: '0 0.25rem'
                }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                            Plan de Pago
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatMoney(loan.amount + loan.interest)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {loan.days} días <span style={{ margin: '0 0.25rem', color: 'var(--border-color)' }}>|</span> {formatMoney(loan.fee)} c/u
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                            Pendiente
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b91c1c', letterSpacing: '-0.02em' }}>
                            {formatMoney((loan as any).remainingAmount || 0)}
                        </div>
                    </div>
                </div>

                {/* Metadata: Address & Validity */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    marginBottom: '0.5rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.address}</span>
                    </div>
                    {loan.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <a href={`tel:${loan.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{loan.phone}</a>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>{formatDateUTC(loan.startDate)} - {formatDateUTC(loan.endDate)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Actions Footer */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 48px', 
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-app)'
            }}>
                <button 
                    onClick={() => onPay(loan)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRight: '1px solid var(--border-color)',
                        color: 'var(--color-success)',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
                    Pagar
                </button>
                <button 
                    onClick={() => onDetails(loan)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRight: '1px solid var(--border-color)',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    Detalles
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LoanActions
                        loan={loan}
                        currentUser={currentUser}
                        isMobile={true}
                        today={today}
                        onPay={onPay}
                        onDetails={onDetails}
                        onRenew={onRenew}
                        onReassign={onReassign}
                        onDelete={onDelete}
                        shareRef={shareRef}
                        minimal={true}
                    />
                </div>
            </div>
        </div>
    );
}
