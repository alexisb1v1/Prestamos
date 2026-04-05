'use client';
 
import { useState, MouseEvent } from 'react';
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
    onUpdateInfo: (loan: Loan) => void;
    shareRef?: React.RefObject<any>;
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
    onUpdateInfo,
    shareRef,
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

    const [isSharing, setIsSharing] = useState(false);
    const statusColor = getStatusColor();

    const handleShare = async (e: MouseEvent) => {
        e.stopPropagation();
        if (loan && shareRef?.current) {
            setIsSharing(true);
            try {
                await shareRef.current.shareLoan(loan);
            } catch (error) {
                console.error("Error al compartir ficha:", error);
            } finally {
                setIsSharing(false);
            }
        }
    };

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '28px',
            border: '1px solid #e2e8f0',
            boxShadow: isDragging ? '0 15px 35px -5px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
            opacity: isDragging ? 0.9 : 1,
            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header: Indice, Status, Nombre y Pendiente */}
            <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {showDragHandle && (
                            <div 
                                {...dragHandleProps} 
                                style={{ 
                                    cursor: 'grab', 
                                    color: '#cbd5e1', 
                                    display: 'flex',
                                    alignItems: 'center',
                                    touchAction: 'none' 
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            </div>
                        )}
                        <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 900, 
                            color: '#4f46e5',
                            minWidth: '1.1rem'
                        }}>
                            {index + 1}.
                        </span>
                        <div style={{ 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '50%', 
                            backgroundColor: statusColor, 
                            boxShadow: '0 0 0 4px #f8fafc',
                            flexShrink: 0,
                            margin: '0 0.25rem'
                        }}></div>
                        <h3 style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 900, 
                            color: '#1e293b', 
                            margin: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {loan.clientName}
                        </h3>
                    </div>
 
                    {/* INFO CONTACTO: Alineado debajo del nombre con sangría ml-10 */}
                    <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            {loan.address ? (
                                <span style={{ textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loan.address}</span>
                            ) : (
                                <button onClick={() => onUpdateInfo(loan)} style={{ background: 'none', border: 'none', padding: 0, color: '#4f46e5', fontSize: 'inherit', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Registrelo</button>
                            )}
                        </div>
 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#4f46e5', fontSize: '11px', fontWeight: 700 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            {loan.phone ? (
                                <a href={`tel:${loan.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{loan.phone}</a>
                            ) : (
                                <button onClick={() => onUpdateInfo(loan)} style={{ background: 'none', border: 'none', padding: 0, color: '#4f46e5', fontSize: 'inherit', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Registrelo</button>
                            )}
                        </div>
                    </div>
                </div>
 
                {/* Pendiente Block */}
                <div style={{ textAlign: 'right', marginLeft: '1rem', flexShrink: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Pendiente</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        S/ {Math.round((loan as any).remainingAmount || 0)}
                    </div>
                </div>
            </div>
 
            {/* Footer: Plan, Cuota y Acciones */}
            <div style={{ 
                padding: '1rem 1.25rem', 
                backgroundColor: '#f8fafc80', 
                borderTop: '1px solid #f1f5f9',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Plan</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#334155' }}>
                            S/ {Math.round(loan.amount)}
                        </span>
                    </div>
                    <div style={{ width: '1px', height: '1.5rem', backgroundColor: '#e2e8f0' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Cuota</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4f46e5' }}>
                            S/ {Math.round(loan.fee)}
                        </span>
                    </div>
                </div>
 
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Botón Detalles */}
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
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    
                    {/* Botón Compartir */}
                    <button 
                        onClick={handleShare}
                        disabled={isSharing}
                        title="Compartir Ficha"
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
                            cursor: isSharing ? 'wait' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isSharing ? (
                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" opacity="0.6">
                                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-10deg)' }}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        )}
                    </button>
 
                    {/* Botón Cobrar Principal */}
                    <button 
                        onClick={() => onPay(loan)}
                        style={{
                            padding: '0 1.25rem',
                            height: '38px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.2s'
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
