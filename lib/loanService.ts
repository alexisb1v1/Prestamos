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

    async create(loan: { idPeople: string; amount: number; userId: string; address: string; days: number }): Promise<{ success: boolean; loanId: string }> {
        return api.post<{ success: boolean; loanId: string }>('/loans', loan);
    },

    /**
     * Get loan details (start/end dates and installments)
     */
    getDetails: async (id: string) => {
        return await api.get<any>(`/loans/${id}/details`);
    },

    /**
     * Reassign a loan to a new collector
     */
    async reassign(loanId: string, newUserId: string): Promise<void> {
        return api.patch(`/loans/${loanId}/reassign`, { newUserId });
    },

    /**
     * Delete a loan
     */
    async delete(loanId: string): Promise<{ success: boolean; message: string }> {
        return api.delete<{ success: boolean; message: string }>(`/loans/${loanId}`);
    },

    deleteInstallment: async (installmentId: string) => {
        return await api.delete(`/loans/installments/${installmentId}`);
    },

    /**
     * Register a new installment (payment)
     */
    async registerInstallment(data: { loanId: string; amount: number; userId: string; paymentType: string }): Promise<{ id: string }> {
        return api.post<{ id: string }>('/loans/installments', data);
    },

    /**
     * Get dashboard summary data
     */
    async getDashboardData(userId?: string, companyId?: string): Promise<any> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);

        const queryString = params.toString();
        return api.get<any>(`/loans/dashboard${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get loan report data for specific date range
     */
    async getLoanReport(startDate: string, endDate: string, companyId?: string, userId?: string): Promise<any> {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (companyId) params.append('companyId', companyId);
        if (userId) params.append('userId', userId);

        return api.get<any>(`/reports/loans?${params.toString()}`);
    }
};
