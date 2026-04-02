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
        // Generate or retrieve current device fingerprint (Session ID for backend validation)
        const fingerprint = this.getOrCreateFingerprint();

        const response = await api.post<LoginResponse>('/auth/login', {
            username,
            password,
            fingerprint,
        });

        // Store JWT token in Cookie (accessible by Middleware)
        if (response.token) {
            Cookies.set(TOKEN_KEY, response.token, { expires: 1 }); // Expires in 1 day
        }

        // Store user info in localStorage (for UI display)
        if (response.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(response.user));
            // Ensure fingerprint is in the correct storage for API headers
            const storage = this.getStorage();
            if (storage) {
                storage.setItem('fingerprint', fingerprint);
            }
        }

        return response;
    },

    /**
     * Logout user and clear stored credentials
     */
    logout() {
        Cookies.remove(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        
        // Clear fingerprint from any possible storage
        sessionStorage.removeItem('fingerprint');
        localStorage.removeItem('fingerprint');
        
        // Clear user cache to prevent stale data
        userCache.clear();
    },

    /**
     * Get the appropriate storage based on device type
     * Mobile -> localStorage (for PWA persistence)
     * Desktop -> sessionStorage (for session security)
     */
    getStorage(): Storage | null {
        if (typeof window === 'undefined') return null;
        
        // Detect mobile (screen width < 768px or common PWA indicators)
        const isMobile = window.innerWidth <= 768;
        return isMobile ? localStorage : sessionStorage;
    },

    /**
     * Get or create a random 10-char fingerprint
     */
    getOrCreateFingerprint(): string {
        const storage = this.getStorage();
        if (!storage) return '';
        
        let fp = storage.getItem('fingerprint');
        if (!fp) {
            // Check both storages just in case of transition
            fp = sessionStorage.getItem('fingerprint') || localStorage.getItem('fingerprint');
            
            if (!fp) {
                // Generate a random 10 character alphanumeric string
                fp = Math.random().toString(36).substring(2, 12).toUpperCase();
            }
            storage.setItem('fingerprint', fp);
        }
        return fp;
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
    
    /**
     * Update stored user information partialy
     */
    updateUser(userData: Partial<User>) {
        const currentUser = this.getUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...userData };
            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        }
    }
};
