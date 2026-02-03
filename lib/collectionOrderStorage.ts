/**
 * Utility for managing collection route order persistence in localStorage
 */

const STORAGE_KEY_PREFIX = 'collection_route_order_';
const MAX_AGE_DAYS = 30;

interface OrderData {
    order: number[];
    lastUpdated: number;
}

/**
 * Get the storage key for a specific user/filter
 */
function getStorageKey(userId: string | number): string {
    return `${STORAGE_KEY_PREFIX}${userId || 'all'}`;
}

/**
 * Save the order of loan IDs for a specific user/filter
 */
export function saveCollectionOrder(userId: string | number, loanIds: number[]): void {
    try {
        const key = getStorageKey(userId);
        const data: OrderData = {
            order: loanIds,
            lastUpdated: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving collection order:', error);
    }
}

/**
 * Get the saved order of loan IDs for a specific user/filter
 */
export function getCollectionOrder(userId: string | number): number[] | null {
    try {
        const key = getStorageKey(userId);
        const stored = localStorage.getItem(key);

        if (!stored) {
            return null;
        }

        const data: OrderData = JSON.parse(stored);

        // Check if data is too old
        const ageInDays = (Date.now() - data.lastUpdated) / (1000 * 60 * 60 * 24);
        if (ageInDays > MAX_AGE_DAYS) {
            localStorage.removeItem(key);
            return null;
        }

        return data.order;
    } catch (error) {
        console.error('Error getting collection order:', error);
        return null;
    }
}

/**
 * Clear the saved order for a specific user/filter
 */
export function clearCollectionOrder(userId: string | number): void {
    try {
        const key = getStorageKey(userId);
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error clearing collection order:', error);
    }
}

/**
 * Clean up old orders (>30 days)
 */
export function cleanupOldOrders(): void {
    try {
        const keys = Object.keys(localStorage);
        const orderKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

        orderKeys.forEach(key => {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const data: OrderData = JSON.parse(stored);
                    const ageInDays = (Date.now() - data.lastUpdated) / (1000 * 60 * 60 * 24);

                    if (ageInDays > MAX_AGE_DAYS) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Invalid data, remove it
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (error) {
        console.error('Error cleaning up old orders:', error);
    }
}

/**
 * Apply saved order to a list of loans
 * New loans (not in saved order) will be appended at the end
 * Loans that no longer exist will be removed from the order
 */
export function applySavedOrder<T extends { id: number }>(
    loans: T[],
    savedOrder: number[] | null
): T[] {
    if (!savedOrder || savedOrder.length === 0) {
        return loans;
    }

    // Create a map for quick lookup
    const loanMap = new Map(loans.map(loan => [loan.id, loan]));

    // Build ordered list based on saved order
    const orderedLoans: T[] = [];
    const processedIds = new Set<number>();

    // First, add loans in the saved order
    savedOrder.forEach(id => {
        const loan = loanMap.get(id);
        if (loan) {
            orderedLoans.push(loan);
            processedIds.add(id);
        }
    });

    // Then, add any new loans that weren't in the saved order
    loans.forEach(loan => {
        if (!processedIds.has(loan.id)) {
            orderedLoans.push(loan);
        }
    });

    return orderedLoans;
}
