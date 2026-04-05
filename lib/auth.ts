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
     * Logout user and clear all session data
     * Synchronizes any pending order changes before clearing
     */
    async logout() {
        // 1. Force Sync Collection Order if found
        if (typeof window !== 'undefined') {
            const user = this.getUser();
            if (user) {
                try {
                    const storageKey = `collection_route_order_${user.id}`;
                    const lastOrderData = localStorage.getItem(storageKey);
                    
                    if (lastOrderData) {
                        const { order } = JSON.parse(lastOrderData);
                        // Send last order to backend as emergency sync
                        await api.patch('/users/collection-order', { collectionOrder: order });
                        console.log('✅ Orden de cobro sincronizado forzosamente antes de cerrar sesión.');
                    }
                } catch (e) {
                    console.error('⚠️ Error en sincronización forzada de logout:', e);
                }
            }
        }

        // 2. Clear Auth Cookie
        Cookies.remove(TOKEN_KEY);
        
        // 3. Deep clean LocalStorage
        if (typeof window !== 'undefined') {
            const keysToKeep = ['remembered_username'];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            // 4. Clear all SessionStorage
            sessionStorage.clear();
        }
        
        // 5. Clear memory cache
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
