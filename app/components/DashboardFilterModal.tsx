'use client';

import { Company, User } from '@/lib/types';
import { formatUserName } from '@/lib/utils';

interface DashboardFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    companies: Company[];
    collectors: User[];
    selectedCompanyId: string;
    onCompanyChange: (id: string) => void;
    selectedUserId: string;
    onUserChange: (id: string) => void;
    onApply: () => void;
    isOwner: boolean;
    isAdmin: boolean;
}

export default function DashboardFilterModal({
    isOpen,
    onClose,
    companies,
    collectors,
    selectedCompanyId,
    onCompanyChange,
    selectedUserId,
    onUserChange,
    onApply,
    isOwner,
    isAdmin
}: DashboardFilterModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }} onClick={onClose}>
            <div 
                style={{
                    backgroundColor: 'white',
                    width: '100%',
                    maxWidth: '500px',
                    borderRadius: '1.5rem 1.5rem 1rem 1rem',
                    padding: '1.5rem',
                    position: 'relative',
                    animation: 'slideUp 0.3s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Handlebar */}
                <div style={{
                    width: '40px',
                    height: '4px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '2px',
                    margin: '0 auto -0.5rem auto'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Filtros de Vista</h2>
                    <button 
                        onClick={onClose}
                        style={{ 
                            background: '#f1f5f9', 
                            border: 'none', 
                            borderRadius: '50%', 
                            width: '32px', 
                            height: '32px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                    
                    {/* Empresa Section */}
                    {isOwner && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M8 10h.01"></path><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M10 14h.01"></path><path d="M14 14h.01"></path></svg>
                                Empresa
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <FilterOption 
                                    label="Todas las empresas" 
                                    selected={selectedCompanyId === ""} 
                                    onClick={() => onCompanyChange("")} 
                                />
                                {companies.map(c => (
                                    <FilterOption 
                                        key={c.id}
                                        label={c.companyName} 
                                        selected={selectedCompanyId === c.id} 
                                        onClick={() => onCompanyChange(c.id)} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cobrador Section */}
                    {isAdmin && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Cobrador
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <FilterOption 
                                    label="Todos los cobradores" 
                                    selected={selectedUserId === ""} 
                                    onClick={() => onUserChange("")} 
                                />
                                {selectedCompanyId !== "" && collectors.map(c => (
                                    <FilterOption 
                                        key={c.id}
                                        label={`${c.firstName} ${c.lastName}`} 
                                        selected={selectedUserId === c.id} 
                                        onClick={() => onUserChange(c.id)} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                    <button 
                        onClick={() => {
                            onApply();
                            onClose();
                        }}
                        style={{
                            width: '100%',
                            padding: '1.2rem',
                            backgroundColor: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '1rem',
                            fontSize: '1rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)',
                            transition: 'all 0.2s'
                        }}
                    >
                        Aplicar Filtros
                    </button>
                </div>

                <style jsx>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
}

function FilterOption({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            style={{
                width: '100%',
                padding: '1.15rem 1.25rem',
                backgroundColor: selected ? 'rgba(79, 70, 229, 0.04)' : 'white',
                border: `1.5px solid ${selected ? '#4f46e5' : '#f1f5f9'}`,
                borderRadius: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
            }}
        >
            <span style={{ 
                fontSize: '0.95rem', 
                fontWeight: selected ? 700 : 600, 
                color: selected ? '#4f46e5' : '#334155' 
            }}>{label}</span>
            {selected && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            )}
        </button>
    );
}
