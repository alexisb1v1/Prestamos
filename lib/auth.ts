import Cookies from 'js-cookie';
import { api } from './api';
import { LoginResponse, User } from './types';
import { userCache } from './userCache';

/**
 * Authentication Service
 * Handles user login, logout, and token management
 */

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authService = {
    /**
     * Login user with username and password
     */
    async login(username: string, password: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/users/login', {
            username,
            passwordHash: password, // API expects passwordHash field
        });

        // Check if login was successful
        if (!response.success) {
            throw new Error(response.message || 'Login failed');
        }

        // Store JWT token in Cookie (accessible by Middleware)
        if (response.token) {
            Cookies.set(TOKEN_KEY, response.token, { expires: 1 }); // Expires in 1 day
        }

        // Store user info in localStorage (for UI display)
        if (response.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        }

        return response;
    },

    /**
     * Logout user and clear stored credentials
     */
    logout() {
        Cookies.remove(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // Clear user cache to prevent stale data
        userCache.clear();
    },

    /**
     * Get stored authentication token
     */
    getToken(): string | undefined {
        return Cookies.get(TOKEN_KEY);
    },

    /**
     * Get stored user information
     */
    getUser(): User | null {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    },
};
