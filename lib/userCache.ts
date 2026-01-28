/**
 * User Cache Service
 * Provides in-memory caching for user data with TTL (Time-To-Live)
 * Cache is only used for non-COBRADOR profiles
 */

interface CachedData<T> {
    data: T;
    timestamp: number;
}

class UserCache {
    private cache: Map<string, CachedData<any>> = new Map();
    private readonly TTL = 60 * 60 * 1000; // 1 hour in milliseconds

    /**
     * Get cached data by key
     * Returns null if cache miss or expired
     */
    get<T>(key: string): T | null {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (this.isExpired(cached.timestamp)) {
            this.cache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    /**
     * Store data in cache with current timestamp
     */
    set<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Check if timestamp is expired (older than TTL)
     */
    private isExpired(timestamp: number): boolean {
        return Date.now() - timestamp > this.TTL;
    }

    /**
     * Clear all cached data
     * Called on logout to prevent stale data
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Remove specific cache entry by key
     */
    remove(key: string): void {
        this.cache.delete(key);
    }
}

// Export singleton instance
export const userCache = new UserCache();
