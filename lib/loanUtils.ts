import { differenceInDays, startOfDay, subDays, parseISO } from 'date-fns';
import { Loan } from './types';

export const getLoanStatus = (loan: Loan, referenceDate?: Date) => {
    // If referenceDate provided, use it (assumed to be startOfDay or current time).
    // Normalize to startOfDay to ensure consistent comparison.
    const today = referenceDate ? startOfDay(referenceDate) : startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const startDate = startOfDay(parseISO(loan.startDate));

    // Calculate elapsed days
    let daysElapsed = differenceInDays(yesterday, startDate) + 1;
    if (daysElapsed < 0) daysElapsed = 0;

    const totalDue = daysElapsed * loan.fee;
    // Calculation: Total Paid = (Amount + Interest) - Remaining
    // Use remainingAmount if available, default to 0 (though ideally it should exist)
    const totalPaid = (loan.amount + loan.interest) - (loan.remainingAmount || 0);

    // Case: Recent loan (starts today or tomorrow)
    if (totalDue === 0) return { label: 'Reciente', color: 'var(--color-success)', icon: '🟢', value: 'green' };

    // Case: Green (Up to date)
    if (totalPaid >= totalDue) {
        return { label: 'Al día', color: 'var(--color-success)', icon: '🟢', value: 'green' };
    }

    const debt = totalDue - totalPaid;
    const moraPct = debt / totalDue;

    // Case: Yellow (Mild Delay - up to 50%)
    if (moraPct <= 0.50) {
        return { label: 'Mora Leve', color: '#f59e0b', icon: '🟡', value: 'yellow' };
    }

    // Case: Red (Severe Delay - > 50%)
    return { label: 'Mora Grave', color: 'var(--color-danger)', icon: '🔴', value: 'red' };
};
