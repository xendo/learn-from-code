export class RateLimiter {
    private usage: Map<string, number[]> = new Map();

    /**
     * Checks if the limit for a given key is exceeded.
     * @param key The identifier for the rate limit (e.g., 'scans', 'hints')
     * @param limit The maximum number of occurrences allowed
     * @param windowMs The time window in milliseconds
     * @returns true if the limit is NOT exceeded, false if it IS exceeded
     */
    checkLimit(key: string, limit: number, windowMs: number): boolean {
        const now = Date.now();
        const timestamps = this.usage.get(key) || [];

        // Filter timestamps within the current window
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

        if (validTimestamps.length >= limit) {
            this.usage.set(key, validTimestamps);
            return false;
        }

        // Record the new usage
        validTimestamps.push(now);
        this.usage.set(key, validTimestamps);
        return true;
    }

    /**
     * Gets the remaining number of allowed occurrences.
     */
    getRemaining(key: string, limit: number, windowMs: number): number {
        const now = Date.now();
        const timestamps = this.usage.get(key) || [];
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
        return Math.max(0, limit - validTimestamps.length);
    }
}

// Global singleton instance
export const rateLimiter = new RateLimiter();
