'use client';

import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

export default function SystemClosedPage() {
    const router = useRouter();

    const handleLogout = () => {
        authService.logout();
        router.push('/login');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#f8fafc',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>
                    Sistema Cerrado
                </h1>
                <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
                    El sistema no está aperturado para el día de hoy. Por favor, comuníquese con el administrador para realizar la apertura.
                </p>

                <button
                    onClick={handleLogout}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
