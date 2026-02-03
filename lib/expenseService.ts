import { api } from './api';
import { CreateExpenseRequest } from './types';

export const expenseService = {
    /**
     * Create a new expense
     */
    async create(data: CreateExpenseRequest): Promise<{ id: string }> {
        return api.post<{ id: string }>('/expenses', data);
    },

    /**
     * Get all expenses
     */
    async getAll(date?: string, userId?: string, companyId?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);

        return api.get<any[]>(`/expenses?${params.toString()}`);
    },
};
