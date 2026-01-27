import { api } from './api';
import { User, CreateUserRequest, CreateUserResponse, Person, UpdateUserRequest, UpdateUserResponse } from './types';

export const userService = {
    /**
     * Get all users, optionally filtered by username
     */
    async getAll(username?: string): Promise<User[]> {
        const queryParams = username ? `?username=${encodeURIComponent(username)}` : '';
        return api.get<User[]>(`/users${queryParams}`);
    },

    /**
     * Create a new user
     */
    async create(user: CreateUserRequest): Promise<CreateUserResponse> {
        return api.post<CreateUserResponse>('/users', user);
    },

    /**
     * Update an existing user
     */
    async update(id: string, user: UpdateUserRequest): Promise<UpdateUserResponse> {
        return api.put<UpdateUserResponse>(`/users/${id}`, user);
    },

    /**
     * Delete (deactivate) a user
     */
    async delete(id: string): Promise<{ success: boolean; message: string }> {
        return api.delete<{ success: boolean; message: string }>(`/users/${id}`);
    },

    /**
     * Search person by document
     */
    async searchPerson(documentType: string, documentNumber: string): Promise<Person> {
        return api.get<Person>(`/people/search?documentType=${documentType}&documentNumber=${documentNumber}`);
    },

    /**
     * Toggle Day Closed status for a user
     */
    async toggleDayStatus(id: string, isDayClosed: boolean): Promise<void> {
        return api.patch<void>(`/users/${id}/toggle-day-status`, { isDayClosed });
    },
};
