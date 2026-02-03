'use client';

import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

export default function PaymentRequiredPage() {
    const router = useRouter();

    const handleLogout = () => {
        authService.logout();
        router.push('/login');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', // Red/Error theme
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '2.5rem',
                textAlign: 'center',
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '2.5rem'
                }}>
                    ⚠️
                </div>

                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    color: '#991b1b',
                    marginBottom: '0.75rem'
                }}>
                    Servicio Suspendido
                </h1>

                <p style={{
                    color: '#4b5563',
                    marginBottom: '2rem',
                    lineHeight: '1.6',
                    fontSize: '1rem'
                }}>
                    El servicio se encuentra temporalmente suspendido por falta de pago. Por favor, realiza el pago correspondiente para reactivar el sistema.
                </p>

                <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '0.5rem',
                    border: '1px solid #fecaca',
                    marginBottom: '2rem'
                }}>
                    <p style={{ fontSize: '0.9rem', color: '#b91c1c', fontWeight: '500' }}>
                        Contacta al soporte si crees que esto es un error.
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    className="btn"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        color: '#374151',
                        fontWeight: '600',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        borderRadius: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
