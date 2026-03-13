import { api } from './api';
import { Company, CreateCompanyRequest, UpdateCompanyRequest } from './types';

export const companyService = {
    /**
     * Get all companies
     */
    async getAll(): Promise<Company[]> {
        return api.get<Company[]>('/companies');
    },

    /**
     * Create a new company
     */
    async create(data: CreateCompanyRequest): Promise<{ id: string }> {
        return api.post<{ id: string }>('/companies', data);
    },

    /**
     * Update a company
     */
    async update(id: string, data: UpdateCompanyRequest): Promise<{ message: string }> {
        return api.put<{ message: string }>(`/companies/${id}`, data);
    },

    /**
     * Update company status
     */
    async updateStatus(id: string, status: string): Promise<{ message: string }> {
        return api.patch<{ message: string }>(`/companies/${id}/status`, { status });
    }
};
