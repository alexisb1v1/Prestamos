'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import Sidebar from '../components/Sidebar';
import FabMenu from '../components/FabMenu';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const [showShareButton, setShowShareButton] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const user = authService.getUser();
        if (!user) return;

        setShowShareButton(user.profile === 'COBRADOR' || user.profile === 'ADMIN');

        // Restricted paths logic
        const ownerOnlyPaths = ['/empresas'];
        const adminAndOwnerPaths = ['/cobradores', '/reportes', '/configuracion'];

        if (user.profile === 'COBRADOR') {
            const allRestricted = [...ownerOnlyPaths, ...adminAndOwnerPaths];
            if (user.isDayClosed) {
                router.push('/system-closed');
                return;
            }
            if (allRestricted.some(path => pathname.startsWith(path))) {
                router.push('/dashboard');
            }
        } else if (user.profile === 'ADMIN') {
            if (ownerOnlyPaths.some(path => pathname.startsWith(path))) {
                router.push('/dashboard');
            }
        }
    }, [pathname, router]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* Cabecera superior sólida para móviles */}
            {isMobile && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4rem',
                    backgroundColor: 'var(--bg-app)',
                    zIndex: 40,
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 1rem'
                }}>
                    <div style={{ width: '40px' }}></div> {/* Espaciador invisible para balancear y mantener centrado el título frente a menú hamburguesa */}
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
                        Neo<span style={{ color: 'var(--color-primary)' }}>Cobros</span>
                    </span>
                    <button 
                        onClick={() => {
                            authService.logout();
                            router.push('/login');
                        }}
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: '#fee2e2', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#ef4444'
                        }}
                        title="Cerrar Sesión"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="18" height="18">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
                        </svg>
                    </button>
                </div>
            )}
            
            <div style={{ display: 'flex', flex: 1 }}>
                <Sidebar />
                <main style={{
                    flex: 1,
                    marginLeft: isMobile ? 0 : 'var(--sidebar-width)',
                    padding: '1rem',
                    paddingTop: isMobile ? '5rem' : '2rem', // Más espacio para no chocar con la cabecera
                    transition: 'margin-left 0.3s ease-in-out',
                    width: '100%'
                }}>
                    {children}
                </main>
                {showShareButton && <FabMenu />}
            </div>
        </div >
    );
}
