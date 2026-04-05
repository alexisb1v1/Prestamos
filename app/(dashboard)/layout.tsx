'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import Sidebar from '../components/Sidebar';
import FabMenu from '../components/FabMenu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
                    <div style={{ width: '40px' }}></div> {/* Espacio para el botón de menú que es fixed */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: '1.1', color: '#1e293b' }}>
                            Neo<span style={{ color: '#4f46e5' }}>Cobros</span>
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.02em', marginTop: '0.1rem', textTransform: 'uppercase' }}>
                            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                        </span>
                    </div>
                    <button 
                         onClick={() => {
                             authService.logout();
                             router.push('/login');
                         }}
                         style={{
                             width: '38px', height: '38px', borderRadius: '0.8rem',
                             background: '#fee2e2', border: 'none',
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             cursor: 'pointer', color: '#ef4444'
                         }}
                         title="Cerrar Sesión"
                    >
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            )}
            
            <div style={{ display: 'flex', flex: 1 }}>
                <Sidebar />
                <main style={{
                    flex: 1,
                    marginLeft: isMobile ? 0 : 'var(--sidebar-width)',
                    padding: '1rem',
                    paddingTop: isMobile ? '5.5rem' : '2rem', // Más espacio para no chocar con la cabecera
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
