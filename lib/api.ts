const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            mode: 'cors',
            credentials: 'omit',
        });

        // Parse response body
        const data = await response.json().catch(() => null);

        // Check for API error responses (with statusCode field)
        if (data?.statusCode && data.statusCode >= 400) {
            throw new Error(data.message || `Error: ${data.statusCode}`);
        }

        if (!response.ok) {
            throw new Error(data?.message || `HTTP Error: ${response.status}`);
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
