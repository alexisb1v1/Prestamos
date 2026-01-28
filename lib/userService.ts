import { api } from './api';
import { User, CreateUserRequest, CreateUserResponse, Person, UpdateUserRequest, UpdateUserResponse } from './types';
import { userCache } from './userCache';
import { authService } from './auth';

export const userService = {
    /**
     * Get all users, optionally filtered by username
     * Uses cache for non-COBRADOR profiles (1-hour TTL)
     */
    async getAll(username?: string): Promise<User[]> {
        // Generate cache key based on query parameters
        const cacheKey = `users:${username || 'all'}`;

        // Check if current user is COBRADOR - they never use cache
        const currentUser = authService.getUser();
        const isCobrador = currentUser?.profile === 'COBRADOR';

        // Try to get from cache (only for non-COBRADOR users)
        if (!isCobrador) {
            const cachedUsers = userCache.get<User[]>(cacheKey);
            if (cachedUsers) {
                return cachedUsers;
            }
        }

        // Cache miss or COBRADOR user - fetch from API
        const queryParams = username ? `?username=${encodeURIComponent(username)}` : '';
        const users = await api.get<User[]>(`/users${queryParams}`);

        // Store in cache (only for non-COBRADOR users)
        if (!isCobrador) {
            userCache.set(cacheKey, users);
        }

        return users;
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
