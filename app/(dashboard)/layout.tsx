'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const user = authService.getUser();
        if (!user) return; // Auth check normally handled by middleware or parent, but safe to check

        // Restricted paths for non-ADMIN users
        const restrictedPaths = ['/cobradores', '/reportes', '/configuracion'];

        if (user.profile !== 'ADMIN' && restrictedPaths.some(path => pathname.startsWith(path))) {
            router.push('/dashboard');
        }
    }, [pathname, router]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                marginLeft: 0,
                padding: '2rem',
                paddingTop: isMobile ? '4rem' : '2rem', // Reduced from 5rem for a more compact look
                transition: 'margin-left 0.3s ease-in-out',
                width: '100%' // Ensure width is controlled
            }}>
                {children}
            </main>
        </div >
    );
}
