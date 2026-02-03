import { api } from './api';
import { Company } from './types';

export const companyService = {
    /**
     * Get all companies
     */
    async getAll(): Promise<Company[]> {
        return api.get<Company[]>('/companies');
    }
};
