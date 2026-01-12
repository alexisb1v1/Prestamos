import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface FetchOptions extends RequestInit {
    token?: string;
}

/**
 * API Helper for making HTTP requests to the backend
 * Automatically handles JSON parsing, error responses, and authentication headers
 */
export async function apiRequest<T = any>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { token: providedToken, ...fetchOptions } = options;

    // Try to get token from cookies if not provided
    const token = providedToken || Cookies.get(TOKEN_KEY);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    // Automatically add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: 'same-origin',
        });

        // Parse response body
        const data = await response.json().catch(() => null);

        // Handle 401 Unauthorized (Token expired or invalid)
        if (response.status === 401 && endpoint !== '/users/login') {
            console.warn('Unauthorized request. Logging out...');

            // Clear credentials
            Cookies.remove(TOKEN_KEY);
            if (typeof window !== 'undefined') {
                localStorage.removeItem(USER_KEY);
                // Force redirect to login page if on client side
                window.location.href = '/login';
            }

            const error = new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
            (error as any).statusCode = 401;
            throw error;
        }

        // Check for API error responses (with statusCode field)
        if (data?.statusCode && data.statusCode >= 400) {
            const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
            const error = new Error(message || `Error: ${data.statusCode}`);
            (error as any).statusCode = data.statusCode;
            throw error;
        }

        if (!response.ok) {
            const message = Array.isArray(data?.message) ? data.message.join('. ') : data.message;
            const error = new Error(message || `HTTP Error: ${response.status}`);
            (error as any).statusCode = response.status;
            throw error;
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: <T = any>(endpoint: string, token?: string) =>
        apiRequest<T>(endpoint, { method: 'GET', token }),

    post: <T = any>(endpoint: string, body: any, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
            token,
        }),

    put: <T = any>(endpoint: string, body: any, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
            token,
        }),

    delete: <T = any>(endpoint: string, token?: string) =>
        apiRequest<T>(endpoint, { method: 'DELETE', token }),
};
