'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.login(username, password);

            // Check for System Closed status
            if (response.user.isDayClosed && response.user.profile === 'COBRADOR') {
                router.push('/system-closed');
            } else {
                // Redirect to dashboard on success
                router.push('/dashboard');
            }
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
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 100%)'
        }}>
            <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--color-primary)', borderRadius: '12px', margin: '0 auto 1rem' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Bienvenido</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Ingresa a tu cuenta</p>
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
                            <input type="checkbox" /> Recuerdame
                        </label>
                        <a href="#" style={{ color: 'var(--color-primary)' }}>¿Olvidaste tu contraseña?</a>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.875rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
