'use client';

import { useState, useEffect, useMemo } from 'react';
import { authService } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { User } from '@/lib/types';

/**
 * Hook to easily access user permissions in any component.
 */
export function usePermissions() {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            return authService.getUser();
        }
        return null;
    });

    useEffect(() => {
        // Listen for storage changes in case of multi-tab login/logout
        const handleStorage = () => setUser(authService.getUser());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const permissions = useMemo(() => getPermissions(user), [user]);

    return {
        user,
        profile: user?.profile,
        ...permissions,
        isAdmin: user?.profile === 'ADMIN' || user?.profile === 'OWNER',
        isOwner: user?.profile === 'OWNER',
        isCobrador: user?.profile === 'COBRADOR',
    };
}
