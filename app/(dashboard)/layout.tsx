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

        // Restricted paths for non-ADMIN users
        const restrictedPaths = ['/cobradores', '/reportes', '/configuracion'];

        if (user.profile !== 'ADMIN') {
            // Check if day is closed
            if (user.isDayClosed) {
                router.push('/system-closed');
                return;
            }

            // Check restricted paths
            if (restrictedPaths.some(path => pathname.startsWith(path))) {
                router.push('/dashboard');
            }
        }
    }, [pathname, router]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                marginLeft: 0,
                padding: '2rem',
                paddingTop: isMobile ? '4rem' : '2rem',
                transition: 'margin-left 0.3s ease-in-out',
                width: '100%'
            }}>
                {children}
            </main>
            {showShareButton && <FabMenu />}
        </div >
    );
}
