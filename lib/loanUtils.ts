import { differenceInDays, startOfDay, subDays, parseISO } from 'date-fns';
import { Loan } from './types';

export const getLoanStatus = (loan: Loan, referenceDate?: Date) => {
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
