import { api } from './api';
import { Company } from './types';

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
    async create(company: Partial<Company>): Promise<Company> {
        return api.post<Company>('/companies', company);
    },

    /**
     * Update a company
     */
    async update(id: string, company: Partial<Company>): Promise<Company> {
        return api.put<Company>(`/companies/${id}`, company);
    },

    /**
     * Deactivate a company
     */
    async deactivate(id: string): Promise<void> {
        return api.patch(`/companies/${id}/deactivate`, {});
    }
};
