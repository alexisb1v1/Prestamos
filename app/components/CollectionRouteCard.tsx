'use client';

import { useState, MouseEvent, useEffect } from 'react';
import { Loan } from '@/app/features/loans';
import { formatMoney, getLoanStatus } from '@/lib/loanUtils';
import { User } from '@/lib/types';
import LoanActions from './LoanActions';
import {
    MapPin,
    Phone,
    Wallet,
    Eye,
    Share2,
    Menu
} from 'lucide-react';

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

    // Estados
    const [isSharing, setIsSharing] = useState(false);
    const [showFullName, setShowFullName] = useState(false);

    // Cálculos dinámicos
    const status = getLoanStatus(loan, today);
    const remainingAmount = (loan as any).remainingAmount || 0;
    const totalAmount = loan.amount + loan.interest;
    const paidAmount = totalAmount - remainingAmount;
    const totalCuotas = loan.days;
    const paidCuotas = Math.max(0, Math.min(totalCuotas, Math.round(paidAmount / loan.fee)));
    const progress = (paidAmount / totalAmount) * 100;

    // Lógica de abreviación de nombres
    // Alexis Fernando Basilio Verastegui -> Alexis F. Basilio V.
    // Jorge Luis Villavicencio -> Jorge L. Villavicencio
    const getCompactName = (name: string) => {
        if (!name) return '';
        const parts = name.trim().split(/\s+/);

        if (parts.length >= 4) {
            // Caso 2 nombres, 2 apellidos (o más)
            return `${parts[0]} ${parts[1][0]}. ${parts[2]} ${parts[3][0]}.`;
        }

        if (parts.length === 3) {
            // Heurística para Jorge Luis Villavicencio -> Jorge L. Villavicencio
            // O Claudia Dosantos Mendoza -> Claudia Dosantos M.
            // Si la segunda parte es corta, probablemente es un nombre medio. 
            // Si la segunda parte es larga, probablemente es el apellido principal.
            if (parts[1].length <= 4) {
                return `${parts[0]} ${parts[1][0]}. ${parts[2]}`;
            } else {
                return `${parts[0]} ${parts[1]} ${parts[2][0]}.`;
            }
        }

        return name;
    };

    const compactName = getCompactName(loan.clientName);

    // Auto-ocultar nombre completo después de 3 segundos
    useEffect(() => {
        if (showFullName) {
            const timer = setTimeout(() => setShowFullName(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showFullName]);

    // Configuración de colores
    const getStatusColor = () => {
        switch (status.value) {
            case 'green': return '#10b981';
            case 'yellow': return '#f59e0b';
            case 'red': return '#ef4444';
            case 'blue': return '#4f46e5';
            default: return '#94a3b8';
        }
    };

    const statusColor = getStatusColor();

    const handleShare = async (e: MouseEvent) => {
        e.stopPropagation();
        if (loan && shareRef?.current) {
            setIsSharing(true);
            try {
                await shareRef.current.shareLoan(loan);
            } catch (error) {
                console.error("Error al compartir:", error);
            } finally {
                setIsSharing(false);
            }
        }
    };

    return (
        <div
            style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: isDragging ? '0 15px 30px -5px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0, 0, 0, 0.02)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                position: 'relative',
                marginBottom: '0.1rem',
                opacity: isDragging ? 0.7 : 1,
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Franja Lateral */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: statusColor }}></div>

            {/* 1. Header: Estado, Manejador y Pendiente */}
            <div style={{ padding: '0.85rem 1.25rem 0.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor }}></div>
                    <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: statusColor }}>
                        {status.label}
                    </span>
                </div>

                {showDragHandle && (
                    <div
                        {...dragHandleProps}
                        style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: '#cbd5e1', cursor: 'grab', display: 'flex', alignItems: 'center', zIndex: 10 }}
                    >
                        <Menu size={18} strokeWidth={2.5} />
                    </div>
                )}

                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '8px', fontWeight: 900, color: '#fb7185', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Pendiente</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {formatMoney(remainingAmount)}
                    </p>
                </div>
            </div>

            {/* 2. Cuerpo: Cliente (con Abreviación) y Cobrar */}
            <div style={{ padding: '0.15rem 1.25rem 0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <div
                        onClick={() => setShowFullName(!showFullName)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer' }}
                        title={loan.clientName}
                    >
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: showFullName ? '#4f46e5' : '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s ease' }}>
                            <span style={{ color: '#4f46e5', marginRight: '0.4rem', fontWeight: 900 }}>{index + 1}.</span>
                            {showFullName ? loan.clientName : compactName}
                        </h3>
                    </div>

                    {/* Tooltip flotante premium (Solo se muestra brevemente al hacer tap) */}
                    {showFullName && (
                        <div style={{
                            position: 'absolute',
                            top: '-32px',
                            left: '20px',
                            backgroundColor: '#1e293b',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 600,
                            zIndex: 100,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            pointerEvents: 'none',
                            animation: 'fadeInOut 0.3s ease'
                        }}>
                            {loan.clientName}
                            <div style={{ position: 'absolute', bottom: '-4px', left: '10px', width: '8px', height: '8px', backgroundColor: '#1e293b', transform: 'rotate(45deg)' }}></div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '10px', fontWeight: 600, color: '#64748b', lineHeight: '1.2' }}>
                            <MapPin size={12} strokeWidth={2.5} style={{ opacity: 0.7, marginTop: '1px', flexShrink: 0 }} />
                            <span style={{ textTransform: 'uppercase' }}>
                                {loan.address || 'Sin dirección'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', fontWeight: 800, color: '#4f46e5' }}>
                            <Phone size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />
                            <a href={`tel:${loan.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{loan.phone || 'Sin teléfono'}</a>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => onPay(loan)}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', backgroundColor: '#10b981', color: 'white', borderRadius: '14px', border: 'none', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', cursor: 'pointer' }}
                >
                    <Wallet size={16} strokeWidth={2.5} /> COBRAR
                </button>
            </div>

            {/* 3. Barra de Progreso */}
            <div style={{ padding: '0.45rem 1.25rem 0.2rem', borderTop: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Progreso</span>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase' }}>
                        {paidCuotas}/{totalCuotas} cuotas
                    </span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
                </div>
            </div>

            {/* 4. Footer: Estadísticas y Herramientas */}
            <div style={{ padding: '0.2rem 1.25rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc80', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', lineHeight: 1 }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Plan</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569' }}>{formatMoney(totalAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', lineHeight: 1 }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Cuota</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4f46e5' }}>{formatMoney(loan.fee)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <button onClick={() => onDetails(loan)} style={{ width: '28px', height: '28px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                        <Eye size={16} strokeWidth={2.5} />
                    </button>
                    <button onClick={handleShare} disabled={isSharing} style={{ width: '28px', height: '28px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: isSharing ? 'wait' : 'pointer' }}>
                        <Share2 size={16} strokeWidth={2.5} />
                    </button>
                    <div style={{ scale: 0.85 }}>
                        <LoanActions loan={loan} currentUser={currentUser} isMobile={true} today={today} onPay={onPay} onDetails={onDetails} onRenew={() => { }} onReassign={() => { }} onDelete={() => { }} shareRef={shareRef as any} minimal={true} />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeInOut {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
