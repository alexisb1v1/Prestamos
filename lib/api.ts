import { ResultAsync } from 'neverthrow';
import Cookies from 'js-cookie';
import { DomainError } from './domain-error';
import { logger } from './logging-service';

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
export async function apiRequest<T = unknown>(
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
            logger.warn('Unauthorized request. Logging out...');

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
            const apiError = error as any;
            apiError.statusCode = data.statusCode || response.status;
            apiError.errorCode = data.errorCode || 'API_ERROR';
            apiError.timestamp = data.timestamp || new Date().toISOString();
            throw error;
        }

        if (!response.ok) {
            const message = Array.isArray(data?.message) ? data.message.join('. ') : data.message;
            const error = new Error(message || `HTTP Error: ${response.status}`);
            const apiError = error as any;
            apiError.statusCode = response.status;
            apiError.errorCode = 'HTTP_ERROR';
            apiError.timestamp = new Date().toISOString();
            throw error;
        }

        return data as T;
    } catch (error: unknown) {
        // En Next.js Dev, un console.error de una petición rechazada activa la molesta pantalla roja.
        // Silenciamos los 401 (Auth esperado), 404 o mensajes de "no encontrado" porque son flujos esperados.
        const apiErr = error as DomainError;
        const isExpectedError = 
            apiErr.statusCode === 401 || 
            apiErr.statusCode === 404 || 
            apiErr.message?.toLowerCase().includes('not found') || 
            apiErr.message?.toLowerCase().includes('no encontrado');

        if (!isExpectedError) {
            logger.error('API Request Error:', apiErr);
        }
        throw error;
    }
}

/**
 * Convenience methods for common HTTP verbs
 */
export interface ErrorResponse {
    statusCode: number;
    errorCode: string;
    message: string | string[];
    timestamp: string;
}

export const api = {
    get: <T = unknown>(endpoint: string, token?: string) =>
        apiRequest<T>(endpoint, { method: 'GET', token }),

    post: <T = unknown>(endpoint: string, body: unknown, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
            token,
        }),

    put: <T = unknown>(endpoint: string, body: unknown, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
            token,
        }),

    delete: <T = unknown>(endpoint: string, token?: string) =>
        apiRequest<T>(endpoint, { method: 'DELETE', token }),

    patch: <T = unknown>(endpoint: string, body: unknown, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
            token,
        }),

    /**
     * Versiones "safe" que retornan ResultAsync siguiendo el estándar Clean Architecture
     */
    safe: {
        get: <T = unknown>(endpoint: string, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.get<T>(endpoint, token),
                (error: unknown) => {
                    const err = error as any;
                    return new DomainError(
                        err.message || 'Error en la petición',
                        err.errorCode || 'API_ERROR',
                        err.statusCode || 500,
                        err.timestamp || new Date().toISOString(),
                        err
                    );
                }
            ),

        post: <T = unknown>(endpoint: string, body: unknown, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.post<T>(endpoint, body, token),
                (error: unknown) => {
                    const err = error as any;
                    return new DomainError(
                        err.message || 'Error en la petición',
                        err.errorCode || 'API_ERROR',
                        err.statusCode || 500,
                        err.timestamp || new Date().toISOString(),
                        err
                    );
                }
            ),

        put: <T = unknown>(endpoint: string, body: unknown, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.put<T>(endpoint, body, token),
                (error: unknown) => {
                    const err = error as any;
                    return new DomainError(
                        err.message || 'Error en la petición',
                        err.errorCode || 'API_ERROR',
                        err.statusCode || 500,
                        err.timestamp || new Date().toISOString(),
                        err
                    );
                }
            ),

        delete: <T = unknown>(endpoint: string, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.delete<T>(endpoint, token),
                (error: unknown) => {
                    const err = error as any;
                    return new DomainError(
                        err.message || 'Error en la petición',
                        err.errorCode || 'API_ERROR',
                        err.statusCode || 500,
                        err.timestamp || new Date().toISOString(),
                        err
                    );
                }
            ),

        patch: <T = unknown>(endpoint: string, body: unknown, token?: string): ResultAsync<T, DomainError> =>
            ResultAsync.fromPromise(
                api.patch<T>(endpoint, body, token),
                (error: unknown) => {
                    const err = error as any;
                    return new DomainError(
                        err.message || 'Error en la petición',
                        err.errorCode || 'API_ERROR',
                        err.statusCode || 500,
                        err.timestamp || new Date().toISOString(),
                        err
                    );
                }
            ),
    }
};
