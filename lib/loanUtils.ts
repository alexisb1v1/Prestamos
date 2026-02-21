import { differenceInDays, startOfDay, subDays, parseISO } from 'date-fns';
import { Loan } from './types';

export const formatDateUTC = (dateString: string) => {
    if (!dateString) return '-';
    // Create Date object
    const date = new Date(dateString);
    // Use UTC methods to ignore browser timezone
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export const getLoanStatus = (loan: Loan, referenceDate?: Date) => {
    // If loan is Liquidado, return Liquidado status immediately
    if (loan.status === 'Liquidado' || (loan as any).remainingAmount === 0) {
        return { label: 'Liquidado', color: 'var(--color-primary)', icon: '🔵', value: 'blue' };
    }

    // If referenceDate provided, use it (assumed to be startOfDay or current time).
    // Normalize to startOfDay to ensure consistent comparison.
    const today = referenceDate ? startOfDay(referenceDate) : startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const startDate = startOfDay(parseISO(loan.startDate));

    // Calculate elapsed days (up to yesterday, not including today)
    let daysElapsed = differenceInDays(yesterday, startDate) + 1;
    if (daysElapsed < 0) daysElapsed = 0;

    const totalDue = daysElapsed * loan.fee;
    // Calculation: Total Paid = (Amount + Interest) - Remaining
    const totalPaid = (loan.amount + loan.interest) - (loan.remainingAmount || 0);

    // Case: Recent loan (starts today or tomorrow)
    if (totalDue === 0) return { label: 'Reciente', color: 'var(--color-success)', icon: '🟢', value: 'green' };

    // Calculate debt and days overdue
    const debt = totalDue - totalPaid;
    const daysOverdue = Math.max(0, Math.floor(debt / loan.fee));

    // Case: Green (0-1 days overdue - al día o recién empezando)
    if (daysOverdue <= 1) {
        return { label: 'Al día', color: 'var(--color-success)', icon: '🟢', value: 'green' };
    }

    // Case: Yellow (2-5 days overdue - mora leve)
    if (daysOverdue >= 2 && daysOverdue <= 5) {
        return { label: `Mora Leve (${daysOverdue} días)`, color: '#f59e0b', icon: '🟡', value: 'yellow' };
    }

    // Case: Red (6+ days overdue - mora grave)
    return { label: `Mora Grave (${daysOverdue} días)`, color: 'var(--color-danger)', icon: '🔴', value: 'red' };
};
