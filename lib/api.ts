import Cookies from 'js-cookie';
import { okAsync, errAsync, ResultAsync } from 'neverthrow';
import { DomainError } from './domain-error';

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

    // Automatically add Fingerprint header if exists in storage
    if (typeof window !== 'undefined') {
        const fingerprint = sessionStorage.getItem('fingerprint') || localStorage.getItem('fingerprint');
        if (fingerprint) {
            headers['X-Fingerprint'] = fingerprint;
        }
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
        // We check BOTH the HTTP status and the data.statusCode if present
        const isUnauthorized = response.status === 401 || (data?.statusCode === 401);
        const isLoginEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/users/login');

        if (isUnauthorized && !isLoginEndpoint) {
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

        // Check for API error responses (new standard structure)
        if (data?.errorCode || (data?.statusCode && data.statusCode >= 400)) {
            const message = Array.isArray(data.message)
                ? data.message.join('. ')
                : (data.message || data.error || `Error desconocido (${data.statusCode || response.status})`);

            const error = new Error(message);
            (error as any).statusCode = data.statusCode || response.status;
            (error as any).errorCode = data.errorCode || 'API_ERROR';
            (error as any).timestamp = data.timestamp || new Date().toISOString();
            throw error;
        }

        if (!response.ok) {
            const message = Array.isArray(data?.message) ? data.message.join('. ') : data.message;
            const error = new Error(message || `HTTP Error: ${response.status}`);
            (error as any).statusCode = response.status;
            (error as any).errorCode = 'HTTP_ERROR';
            (error as any).timestamp = new Date().toISOString();
            throw error;
        }

        return data;
    } catch (error: any) {
        // En Next.js Dev, un console.error de una petición rechazada activa la molesta pantalla roja.
        // Silenciamos los 404 o mensajes de "no encontrado" porque son flujos esperados (ej. buscar cliente).
        if (error.statusCode !== 404 && !error.message?.toLowerCase().includes('not found') && !error.message?.toLowerCase().includes('no encontrado')) {
            console.error('API Request Error:', error);
        }
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

    patch: <T = any>(endpoint: string, body: any, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
            token,
        }),

    /**
     * Versiones "safe" que retornan ResultAsync siguiendo el estándar Clean Architecture
     */
    safe: {
        get: <T = any>(endpoint: string, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.get<T>(endpoint, token),
                (error: any) => new DomainError(
                    error.message || 'Error en petición GET',
                    error.errorCode || 'FETCH_ERROR',
                    error.statusCode || 500,
                    error.timestamp || new Date().toISOString(),
                    error
                )
            ),

        post: <T = any>(endpoint: string, body: any, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.post<T>(endpoint, body, token),
                (error: any) => new DomainError(
                    error.message || 'Error en petición POST',
                    error.errorCode || 'POST_ERROR',
                    error.statusCode || 500,
                    error.timestamp || new Date().toISOString(),
                    error
                )
            ),

        put: <T = any>(endpoint: string, body: any, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.put<T>(endpoint, body, token),
                (error: any) => new DomainError(
                    error.message || 'Error en petición PUT',
                    error.errorCode || 'PUT_ERROR',
                    error.statusCode || 500,
                    error.timestamp || new Date().toISOString(),
                    error
                )
            ),

        delete: <T = any>(endpoint: string, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.delete<T>(endpoint, token),
                (error: any) => new DomainError(
                    error.message || 'Error en petición DELETE',
                    error.errorCode || 'DELETE_ERROR',
                    error.statusCode || 500,
                    error.timestamp || new Date().toISOString(),
                    error
                )
            ),

        patch: <T = any>(endpoint: string, body: any, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.patch<T>(endpoint, body, token),
                (error: any) => new DomainError(
                    error.message || 'Error en petición PATCH',
                    error.errorCode || 'PATCH_ERROR',
                    error.statusCode || 500,
                    error.timestamp || new Date().toISOString(),
                    error
                )
            ),
    }
};
