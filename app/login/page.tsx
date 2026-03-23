'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { getLandingRoute } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberUser, setRememberUser] = useState(false); // Estado para el checkbox
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Cargar usuario guardado al iniciar
    useEffect(() => {
        const savedUsername = localStorage.getItem('remembered_username');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberUser(true);
        }
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.login(username, password);

            // Lógica para guardar/olvidar usuario
            if (rememberUser) {
                localStorage.setItem('remembered_username', username);
            } else {
                localStorage.removeItem('remembered_username');
            }

            router.push(getLandingRoute(response));
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc', // Fondo gris muy limpio
            padding: '1rem'
        }}>
            <div className="shadow-pulse-card" style={{ 
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '12px' // Curvatura sutil y corporativa
            }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                        borderRadius: '14px',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.5rem',
                        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
                    }}>
                        💰
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#0f172a' }}>Iniciar Sesión</h1>
                    <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Accede a tu panel de control
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        marginBottom: '1.25rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #f87171',
                        borderRadius: '6px',
                        color: '#b91c1c',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label className="label" style={{ fontWeight: 500, color: '#0f172a' }}>Usuario</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px' }} // Sobrescribir input global si es necesario
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                            <label className="label" style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>Contraseña</label>
                            <a href="#" style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: '500', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
                        </div>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#475569', fontSize: '0.9rem' }}>
                            <input
                                type="checkbox"
                                checked={rememberUser}
                                onChange={(e) => setRememberUser(e.target.checked)}
                                style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                            /> 
                            Recuérdame
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.85rem',
                            marginTop: '0.5rem',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
