import React from 'react';

/**
 * LoadingSpinner
 * Componente centralizado para mostrar estados de carga en toda la plataforma NeoCobros.
 */
interface LoadingSpinnerProps {
    message?: string;
}

export default function LoadingSpinner({ message = 'Cargando...' }: LoadingSpinnerProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5rem 1rem',
            gap: '0.75rem',
            color: 'var(--text-secondary)',
            width: '100%',
            gridColumn: '1 / -1' // Ocupa todo el ancho si está dentro de un Grid
        }}>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
                style={{ 
                    width: '32px', 
                    height: '32px', 
                    color: 'var(--color-primary)',
                    animation: 'spin_loader 1s linear infinite'
                }}
            >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
            </svg>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message}</span>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin_loader {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
}
