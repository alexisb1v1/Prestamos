import { api } from './api';
import { LoginRequest, LoginResponse } from './types';

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

        // Store JWT token and user info in localStorage
        if (response.token) {
            localStorage.setItem(TOKEN_KEY, response.token);
        }

        if (response.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        }

        return response;
    },

    /**
     * Logout user and clear stored credentials
     */
    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    /**
     * Get stored authentication token
     */
    getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user information
     */
    getUser() {
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
