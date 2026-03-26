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
                boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s ease',
                marginBottom: '0.5rem'
            }}
        >
            <div style={{ padding: '1rem 1rem 0.25rem 1rem' }}>
                {/* Header: Draggable + Index + Client Info + Status */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    paddingBottom: '0.75rem',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', flex: 1 }}>
                        {showDragHandle && dragHandleProps && (
                            <div
                                {...dragHandleProps}
                                style={{
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'var(--text-secondary)',
                                    paddingTop: '0.25rem',
                                    touchAction: 'none'
                                }}
                                title="Arrastra para reordenar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </div>
                        )}
                        
                        {typeof index === 'number' && (
                            <div style={{
                                minWidth: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                flexShrink: 0
                            }}>
                                {index + 1}
                            </div>
                        )}
                        
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
                                {loan.clientName?.toLowerCase() || 'SIN NOMBRE'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {loan.documentNumber || 'S/D'}
                            </div>
                        </div>
                    </div>
                    
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }} title={status.label}>
                        {status.icon}
                    </span>
                </div>

                {/* Main Data Section (Horizontal Layout) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: '0.75rem',
                    backgroundColor: 'var(--bg-app)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Monto:</span> <strong>{formatMoney(loan.amount)}</strong></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Interés:</span> <strong>{formatMoney(loan.interest)}</strong></div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Días:</span> <strong>{loan.days}</strong>
                            <span style={{ margin: '0 0.35rem', color: '#cbd5e1' }}>|</span>
                            <span style={{ color: 'var(--text-secondary)' }}>Cuota:</span> <strong>{formatMoney(loan.fee)}</strong>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                        <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total:</span> <strong>{formatMoney(loan.amount + loan.interest)}</strong>
                        </div>
                        <div style={{ 
                            marginTop: '0.15rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end'
                        }}>
                            <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Restante</span>
                            <span style={{ fontWeight: 900, color: '#b91c1c', fontSize: '1.3rem', lineHeight: 1 }}>
                                {formatMoney((loan as any).remainingAmount || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Info: Address + Validity */}
                <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    paddingBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Dirección:</span>
                        <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{loan.address}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span>Vigencia:</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)', textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.1rem' }}>
                                {formatDateUTC(loan.startDate)} - {formatDateUTC(loan.endDate)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.25rem' }}>
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
                    />
                </div>
            </div>
        </div>
    );
}
