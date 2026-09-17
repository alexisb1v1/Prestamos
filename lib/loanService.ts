import { api } from './api';
import { Loan, LoanDetails, DashboardData, ReportData } from './types';

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
        return api.get<Loan[]>(`/loan${queryString ? `?${queryString}` : ''}`);
    },

    async create(loan: { idPeople: string; amount: number; userId: string; address: string; days: number; companyId?: string }): Promise<{ success: boolean; loanId: string }> {
        return api.post<{ success: boolean; loanId: string }>('/loan', loan);
    },

    /**
     * Get loan details (start/end dates and installments)
     */
    getDetails: async (id: string) => {
        return await api.get<LoanDetails>(`/loan/${id}/details`);
    },

    /**
     * Reassign a loan to a new collector
     */
    async reassign(loanId: string, newUserId: string): Promise<void> {
        return api.patch(`/loan/${loanId}/reassign`, { newUserId });
    },

    /**
     * Delete a loan
     */
    async delete(loanId: string): Promise<{ success: boolean; message: string }> {
        return api.delete<{ success: boolean; message: string }>(`/loan/${loanId}`);
    },

    deleteInstallment: async (installmentId: string) => {
        return await api.delete(`/installment/${installmentId}`);
    },

    /**
     * Register a new installment (payment)
     */
    async registerInstallment(data: { loanId: string; amount: number; userId: string; paymentType: string }): Promise<{ id: string }> {
        return api.post<{ id: string }>('/installment', data);
    },

    /**
     * Get dashboard summary data
     */
    async getDashboardData(userId?: string, companyId?: string): Promise<DashboardData> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);

        const queryString = params.toString();
        return api.get<DashboardData>(`/dashboard${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get loan report data for specific date range
     */
    async getLoanReport(startDate: string, endDate: string, companyId?: string, userId?: string): Promise<ReportData[]> {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (companyId) params.append('companyId', companyId);
        if (userId) params.append('userId', userId);

        return api.get<ReportData[]>(`/report/loan?${params.toString()}`);
    }
};
