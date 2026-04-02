'use client';

import { Loan } from '@/app/features/loans';
import { formatMoney } from '@/lib/loanUtils';
import { User } from '@/lib/types';

interface CollectionRouteCardProps {
    loan: Loan;
    index: number;
    today: Date;
    currentUser: User | null;
    onPay: (loan: Loan) => void;
    onDetails: (loan: Loan) => void;
    dragHandleProps?: any;
    isDragging?: boolean;
    showDragHandle?: boolean;
}

export default function CollectionRouteCard({
    loan,
    index,
    today,
    currentUser,
    onPay,
    onDetails,
    dragHandleProps,
    isDragging,
    showDragHandle
}: CollectionRouteCardProps) {
    
    const getStatusColor = () => {
        const remaining = (loan as any).remainingAmount || 0;
        if (remaining <= 0) return '#22c55e';
        const dayDiff = Math.floor((today.getTime() - new Date(loan.startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff > 10) return '#ef4444';
        return '#f59e0b';
    };

    const statusColor = getStatusColor();

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '1.25rem',
            padding: '1.1rem',
            border: '2px solid #f1f5f9',
            boxShadow: isDragging ? '0 15px 35px -5px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.03)',
            opacity: isDragging ? 0.9 : 1,
            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
        }}>
            {/* Header: Name, Handle, Dot, Pending */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                    {showDragHandle && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div 
                                {...dragHandleProps} 
                                style={{ 
                                    cursor: 'grab', 
                                    color: '#cbd5e1', 
                                    paddingTop: '0.1rem',
                                    touchAction: 'none' 
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            </div>
                            <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 900, 
                                color: '#6366f1',
                                minWidth: '1.2rem',
                                textAlign: 'center'
                            }}>
                                {index + 1}.
                            </span>
                        </div>
                    )}
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0, marginTop: '0.45rem' }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 900, 
                            color: '#0f172a', 
                            margin: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {loan.clientName}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#94a3b8', fontSize: '0.7rem', marginTop: '1px' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loan.address || 'Sin dirección'}</span>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#f472b6', textTransform: 'uppercase', lineHeight: 1 }}>Pendiente</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>
                        S/ {Math.round((loan as any).remainingAmount || 0)}
                    </div>
                </div>
            </div>

            {/* Subtle Divider */}
            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0 -1.1rem' }}></div>

            {/* Actions & Info Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    {/* Plan Info Block */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>PLAN:</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#475569' }}>
                            S/ {Math.round(loan.amount)}
                        </span>
                    </div>
                    {/* Cuota Info Block */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>CUOTA:</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6366f1' }}>
                            S/ {Math.round(loan.fee)}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button 
                        onClick={() => onDetails(loan)}
                        style={{
                            width: '38px',
                            height: '38px',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button 
                        onClick={() => onPay(loan)}
                        style={{
                            padding: '0 0.85rem',
                            height: '38px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        COBRAR
                    </button>
                </div>
            </div>
        </div>
    );
}
