import { api } from './api';
import { Loan } from './types';

export const loanService = {
    /**
     * Get all loans with optional filters
     */
    async getAll(userId?: string, documentNumber?: string, companyId?: string): Promise<Loan[]> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (documentNumber) params.append('documentNumber', documentNumber);
        if (companyId) params.append('companyId', companyId);

        const queryString = params.toString();
        return api.get<Loan[]>(`/loans${queryString ? `?${queryString}` : ''}`);
    },

    async create(loan: { idPeople: number; amount: number; userId: number; address: string }): Promise<Loan> {
        return api.post<Loan>('/loans', loan);
    },

    /**
     * Get loan details (start/end dates and installments)
     */
    getDetails: async (id: string) => {
        return await api.get<any>(`/loans/${id}/details`);
    },

    deleteInstallment: async (installmentId: string) => {
        return await api.delete(`/loans/installments/${installmentId}`);
    },

    /**
     * Get dashboard summary data
     */
    async getDashboardData(userId?: string | number, companyId?: string): Promise<any> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId.toString());
        if (companyId) params.append('companyId', companyId);

        const queryString = params.toString();
        return api.get<any>(`/loans/dashboard${queryString ? `?${queryString}` : ''}`);
    }
};
