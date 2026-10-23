import { startOfDay, subDays, parseISO } from 'date-fns';
import { Loan } from './types';

export const formatDateLocal = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export const formatDateUTC = (dateString: string) => {
    // Para evitar desfases de medianoche en zonas horarias como UTC-5 (Perú),
    // formateamos respetando la fecha local de la transacción
    return formatDateLocal(dateString);
};

export const formatMoney = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return 'S/ 0.00';
    return `S/ ${Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getLoanStatus = (loan: Loan, referenceDate?: Date) => {
    // If loan is Liquidado, return Liquidado status immediately
    if (loan.status === 'Liquidado' || (loan as { remainingAmount?: number }).remainingAmount === 0) {
        return { label: 'Liquidado', color: 'var(--color-primary)', icon: '🔵', value: 'blue' };
    }

    // If referenceDate provided, use it (assumed to be startOfDay or current time).
    // Normalize to startOfDay to ensure consistent comparison.
    const today = referenceDate ? startOfDay(referenceDate) : startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const startDate = startOfDay(parseISO(loan.startDate));
    const endDate = startOfDay(parseISO(loan.endDate));

    // Calculate elapsed days excluding Sundays (up to yesterday, capped at endDate)
    const limitDate = yesterday < endDate ? yesterday : endDate;
    let daysElapsed = 0;
    
    if (startDate <= limitDate) {
        const currentDay = new Date(startDate);
        while (currentDay <= limitDate) {
            // 0 is Sunday in JS getDay()
            if (currentDay.getDay() !== 0) {
                daysElapsed++;
            }
            currentDay.setDate(currentDay.getDate() + 1);
        }
    }

    const totalDue = daysElapsed * loan.fee;
    // Calculation: Total Paid = (Amount + Interest) - Remaining
    const totalPaid = (loan.amount + loan.interest) - (loan.remainingAmount || 0);

    // Case: Recent loan (starts today or tomorrow)
    if (totalDue === 0 && today <= startDate) {
        return { label: 'Reciente', color: 'var(--color-success)', icon: '🟢', value: 'green' };
    }

    // Calculate debt and days overdue
    const debt = totalDue - totalPaid;
    const daysOverdue = Math.max(0, Math.floor(debt / loan.fee));
    const isExpired = today > endDate;

    // Case: Green (0-1 days overdue - al día o recién empezando)
    if (daysOverdue <= 1 && !isExpired) {
        return { label: 'Al día', color: 'var(--color-success)', icon: '🟢', value: 'green' };
    }

    // Determine Label prefix
    const labelPrefix = isExpired ? 'Vencido' : (daysOverdue >= 6 ? 'Mora Grave' : 'Mora Leve');
    const statusColor = isExpired || daysOverdue >= 6 ? 'var(--color-danger)' : '#f59e0b';

    return { 
        label: `${labelPrefix} (${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'})`, 
        color: statusColor, 
        icon: isExpired || daysOverdue >= 6 ? '🔴' : '🟡', 
        value: isExpired || daysOverdue >= 6 ? 'red' : 'yellow',
        overdueDays: daysOverdue
    };
};

export interface LoanPerformanceResult {
    isLiquidated: boolean;
    contractStartDate: Date;
    contractEndDate: Date;
    effectiveEndDate: Date;
    hasExtension: boolean;
    extensionDays: number;
    earlyLiquidationDays: number;
    missedPaymentDays: number;
    completedOnTime: boolean;
    creditRating?: string | null;
    lastPaymentDate?: Date;
    completionBadge: {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        icon: string;
    };
    punctualityBadge: {
        label: string;
        color: string;
        bgColor: string;
        borderColor: string;
        icon: string;
    };
}

export const calculateLoanPerformance = (
    loan: {
        startDate: string;
        endDate: string;
        status?: string;
        remainingAmount?: number;
        liquidationDate?: string | Date;
        fee?: number;
        completedOnTime?: boolean;
        earlyLiquidationDays?: number;
        extensionDays?: number;
        delayDays?: number;
        creditRating?: string | null;
    },
    installments?: Array<{ date: string; amount?: number }>
): LoanPerformanceResult => {
    const parseSafe = (dStr: string) => {
        const parts = dStr.split('T')[0].split('-');
        if (parts.length === 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
        const d = new Date(dStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const startDate = parseSafe(loan.startDate);
    let contractEndDate = parseSafe(loan.endDate);

    // Si la fecha fin contractual en BD cayera en domingo, el fin hábil comercial es el sábado previo
    if (contractEndDate.getDay() === 0) {
        contractEndDate.setDate(contractEndDate.getDate() - 1);
    }

    const remaining = loan.remainingAmount ?? 0;
    const isLiquidated = loan.status === 'Liquidado' || remaining === 0;

    // Buscar la fecha del último pago
    let lastPaymentDate: Date | undefined;
    if (installments && installments.length > 0) {
        installments.forEach(inst => {
            const pDate = parseSafe(inst.date);
            if (!lastPaymentDate || pDate > lastPaymentDate) {
                lastPaymentDate = pDate;
            }
        });
    } else if (loan.liquidationDate) {
        lastPaymentDate = parseSafe(String(loan.liquidationDate));
    }

    // 1. Optimización O(1): Si el préstamo ya tiene las columnas persistidas de BD, usarlas directamente
    const hasPersistedData = loan.completedOnTime !== undefined && loan.earlyLiquidationDays !== undefined;

    let extensionDays = hasPersistedData ? (loan.extensionDays ?? 0) : 0;
    let earlyLiquidationDays = hasPersistedData ? (loan.earlyLiquidationDays ?? 0) : 0;
    let missedPaymentDays = hasPersistedData ? (loan.delayDays ?? 0) : 0;
    let completedOnTime = hasPersistedData ? Boolean(loan.completedOnTime) : isLiquidated;
    let effectiveEndDate = new Date(contractEndDate);

    if (!hasPersistedData) {
        // Cálculo reactivo si aún no está sellado en BD
        if (lastPaymentDate && lastPaymentDate > contractEndDate) {
            effectiveEndDate = new Date(lastPaymentDate);

            // Contar días hábiles (excluyendo domingos) entre contractEndDate y lastPaymentDate
            const cur = new Date(contractEndDate);
            cur.setDate(cur.getDate() + 1);
            while (cur <= lastPaymentDate) {
                if (cur.getDay() !== 0) {
                    extensionDays++;
                }
                cur.setDate(cur.getDate() + 1);
            }
        }

        if (isLiquidated && lastPaymentDate && lastPaymentDate < contractEndDate) {
            const cur = new Date(lastPaymentDate);
            cur.setDate(cur.getDate() + 1);
            while (cur <= contractEndDate) {
                if (cur.getDay() !== 0) {
                    earlyLiquidationDays++;
                }
                cur.setDate(cur.getDate() + 1);
            }
        }

        completedOnTime = isLiquidated && extensionDays === 0;

        // Regla de Oro: Solo evaluar días impagos HASTA la fecha de liquidación o término
        const limitDate = isLiquidated && lastPaymentDate && lastPaymentDate < contractEndDate
            ? lastPaymentDate
            : contractEndDate;

        if (installments && installments.length > 0) {
            const paidDaysMap = new Set<string>();
            installments.forEach(inst => {
                const d = parseSafe(inst.date);
                paidDaysMap.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            });

            const cur = new Date(startDate);
            while (cur <= limitDate) {
                if (cur.getDay() !== 0) {
                    const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
                    if (!paidDaysMap.has(key)) {
                        missedPaymentDays++;
                    }
                }
                cur.setDate(cur.getDate() + 1);
            }
        }
    } else {
        if (extensionDays > 0 && lastPaymentDate) {
            effectiveEndDate = new Date(lastPaymentDate);
        }
    }

    const hasExtension = extensionDays > 0;

    // Badges descriptivos
    let completionBadge = {
        label: 'En Fecha Pactada',
        color: '#065f46',
        bgColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        icon: '✓'
    };

    if (earlyLiquidationDays > 0) {
        completionBadge = {
            label: `Cancelación Anticipada (-${earlyLiquidationDays}d)`,
            color: '#065f46',
            bgColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            icon: '⚡'
        };
    } else if (hasExtension) {
        completionBadge = {
            label: `Prórroga: +${extensionDays}d fuera de plazo`,
            color: '#b45309',
            bgColor: '#fffbeb',
            borderColor: '#fde68a',
            icon: '⏱'
        };
    } else if (!isLiquidated) {
        completionBadge = {
            label: 'En Curso',
            color: '#1d4ed8',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            icon: '●'
        };
    }

    let punctualityBadge = {
        label: '100% Puntual (0 retrasos)',
        color: '#065f46',
        bgColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        icon: '★'
    };

    if (missedPaymentDays > 0) {
        punctualityBadge = {
            label: `${missedPaymentDays} ${missedPaymentDays === 1 ? 'cuota' : 'cuotas'} con retraso`,
            color: hasExtension ? '#b91c1c' : '#c2410c',
            bgColor: hasExtension ? '#fef2f2' : '#fff7ed',
            borderColor: hasExtension ? '#fecaca' : '#ffedd5',
            icon: '⚠️'
        };
    }

    return {
        isLiquidated,
        contractStartDate: startDate,
        contractEndDate,
        effectiveEndDate,
        hasExtension,
        extensionDays,
        earlyLiquidationDays,
        missedPaymentDays,
        completedOnTime,
        creditRating: loan.creditRating,
        lastPaymentDate,
        completionBadge,
        punctualityBadge
    };
};

