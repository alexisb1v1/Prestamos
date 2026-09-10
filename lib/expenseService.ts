import { api } from './api';
import { Expense, CreateExpenseRequest } from './types';

export const expenseService = {
    /**
     * Create a new expense
     */
    async create(data: CreateExpenseRequest): Promise<{ id: string }> {
        return api.post<{ id: string }>('/expense', data);
    },

    /**
     * Get all expenses
     */
    async getAll(date?: string, userId?: string, companyId?: string): Promise<Expense[]> {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);

        return api.get<Expense[]>(`/expense?${params.toString()}`);
    },

    /**
     * Delete an expense
     */
    async delete(id: string): Promise<void> {
        return api.delete(`/expense/${id}`);
    }
};
