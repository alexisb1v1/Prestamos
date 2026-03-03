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
            background: 'radial-gradient(circle at top left, #e0e7ff, transparent), radial-gradient(circle at bottom right, #f1f5f9, transparent), #f8fafc',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decorative elements */}
            <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
            <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '250px', height: '250px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: '50%', filter: 'blur(60px)' }}></div>

            <div className="card glass" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '3rem 2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                borderRadius: '32px'
            }}>
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                        borderRadius: '18px',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.5rem',
                        boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)'
                    }}>
                        💰
                    </div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>Bienvenido</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '500' }}>Accede a tu panel de préstamos</p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-danger)',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label className="label">Usuario</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="label">Contraseña</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input
                                type="checkbox"
                                checked={rememberUser}
                                onChange={(e) => setRememberUser(e.target.checked)}
                            /> Recuérdame
                        </label>
                        <a href="#" style={{ color: 'var(--color-primary)' }}>¿Olvidaste tu contraseña?</a>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '1rem',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
