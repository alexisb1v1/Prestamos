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
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
