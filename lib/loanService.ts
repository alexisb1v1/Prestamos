import { api } from './api';
import { Loan } from './types';

export const loanService = {
    /**
     * Get all loans with optional filters
     */
    async getAll(userId?: string, documentNumber?: string): Promise<Loan[]> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (documentNumber) params.append('documentNumber', documentNumber);

        const queryString = params.toString();
        return api.get<Loan[]>(`/loans${queryString ? `?${queryString}` : ''}`);
    },

    async create(loan: { idPeople: number; amount: number; userId: number; address: string }): Promise<Loan> {
        return api.post<Loan>('/loans', loan);
    },

    /**
     * Get loan details (start/end dates and installments)
     */
    async getDetails(loanId: number | string): Promise<any> {
        return api.get<any>(`/loans/${loanId}/details`);
    }
};
