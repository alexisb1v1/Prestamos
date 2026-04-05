import { User, UserPermissions } from './types';
import { differenceInCalendarDays } from 'date-fns';

/**
 * Centralized Permission System (RBAC)
 * Defines what each profile can do within the application.
 */

export const getPermissions = (user: User | null): UserPermissions => {
    const profile = user?.profile;

    return {
        // Loan Management
        canDeleteLoan: profile === 'ADMIN' || profile === 'OWNER',
        canReassignLoan: profile === 'ADMIN' || profile === 'OWNER',
        canCreateLoan: true, // Everyone can currently create loans
        canRenewLoan: true, // Everyone can currently renew loans

        // Payment/Installment Management
        canDeletePayment: (paymentDate: string, registeredByUserId?: string) => {
            if (!paymentDate || !user) return false;

            const pDate = new Date(paymentDate);
            // Usamos métodos locales para que "hoy" dependa de la hora de Lima
            const paymentLocalDate = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate());
            const today = new Date();
            const todayLocalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const diff = differenceInCalendarDays(todayLocalDate, paymentLocalDate);

            if (profile === 'COBRADOR') {
                // Cobradores: Only same day AND must be their own payment (if registeredByUserId is provided)
                const isSameDay = diff === 0;
                const isOwnPayment = !registeredByUserId || registeredByUserId === user.id;
                return isSameDay && isOwnPayment;
            }

            // Admin/Owner: up to 2 days (diff 0 or 1)
            return diff < 2;
        },

        // User/Collector Management
        canManageUsers: profile === 'ADMIN' || profile === 'OWNER',

        // Company Management
        canManageCompanies: profile === 'OWNER',

        // Reports & Expenses
        canViewReports: profile === 'ADMIN' || profile === 'OWNER',
        canViewExpenses: true, // Specific filtering logic still applies in the page
        canCreateExpense: true,
    };
};
