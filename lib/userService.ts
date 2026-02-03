import { api } from './api';
import { User, CreateUserRequest, CreateUserResponse, Person, UpdateUserRequest, UpdateUserResponse } from './types';
import { userCache } from './userCache';
import { authService } from './auth';

export const userService = {
    /**
     * Get all users, optionally filtered by username
     * Uses cache for non-COBRADOR profiles (1-hour TTL)
     * @param username - Optional username filter
     * @param forceRefresh - If true, bypass cache and fetch fresh data from API
     */
    async getAll(username?: string, forceRefresh = false, idCompany?: string): Promise<User[]> {
        // Only cache complete user list (no filters)
        const cacheKey = 'users:all';

        // Check if current user is COBRADOR - they never use cache
        const currentUser = authService.getUser();
        const isCobrador = currentUser?.profile === 'COBRADOR';

        // Try to get from cache (only for non-COBRADOR users, no search filter, no idCompany filter, no forceRefresh)
        // If idCompany is provided, it's a filtered list, so we bypass the "all users" cache.
        if (!forceRefresh && !username && !idCompany && !isCobrador) {
            const cachedUsers = userCache.get<User[]>(cacheKey);
            if (cachedUsers) {
                return cachedUsers;
            }
        }

        // Cache miss, has filter, forceRefresh, or COBRADOR user - fetch from API
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (idCompany) params.append('idCompany', idCompany);

        const queryString = params.toString();
        const users = await api.get<User[]>(`/users${queryString ? `?${queryString}` : ''}`);

        // Only cache complete list (no search filter, no idCompany, non-COBRADOR users)
        if (!username && !idCompany && !isCobrador) {
            userCache.set(cacheKey, users);
        }

        return users;
    },

    /**
     * Create a new user
     * Clears user cache after creation
     */
    async create(user: CreateUserRequest): Promise<CreateUserResponse> {
        const result = await api.post<CreateUserResponse>('/users', user);
        userCache.clear(); // Clear cache to force fresh fetch
        return result;
    },

    /**
     * Update an existing user
     * Clears user cache after update
     */
    async update(id: string, user: UpdateUserRequest): Promise<UpdateUserResponse> {
        const result = await api.put<UpdateUserResponse>(`/users/${id}`, user);
        userCache.clear(); // Clear cache to force fresh fetch
        return result;
    },

    /**
     * Delete (deactivate) a user
     * Clears user cache after deletion
     */
    async delete(id: string): Promise<{ success: boolean; message: string }> {
        const result = await api.delete<{ success: boolean; message: string }>(`/users/${id}`);
        userCache.clear(); // Clear cache to force fresh fetch
        return result;
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
