type ProgressCallback = (data: any) => void;

export interface ProjectLockManager {
    /** Attempts to acquire the lock. Returns true if acquired, false if already locked. */
    tryAcquire(repoUrl: string): Promise<boolean>;
    /** Releases the lock and clears listeners. */
    release(repoUrl: string): Promise<void>;
    /** Subscribes to progress events. Replays historical events for the current lock session. */
    subscribe(repoUrl: string, callback: ProgressCallback): Promise<() => void>;
    /** Publishes a progress event to all listeners and stores it in history. */
    publish(repoUrl: string, data: any): Promise<void>;
}

class InMemoryLockManager implements ProjectLockManager {
    private locks = new Set<string>();
    private listeners = new Map<string, Set<ProgressCallback>>();
    private lastEvents = new Map<string, any[]>();

    async tryAcquire(repoUrl: string): Promise<boolean> {
        if (this.locks.has(repoUrl)) {
            return false;
        }
        this.locks.add(repoUrl);
        this.lastEvents.set(repoUrl, []); // reset history
        return true;
    }

    async release(repoUrl: string): Promise<void> {
        this.locks.delete(repoUrl);
        this.listeners.delete(repoUrl);
        // We keep the last events around briefly just in case, but they could be deleted.
        // Cache will handle future requests anyway.
        this.lastEvents.delete(repoUrl);
    }

    async subscribe(repoUrl: string, callback: ProgressCallback): Promise<() => void> {
        if (!this.listeners.has(repoUrl)) {
            this.listeners.set(repoUrl, new Set());
        }
        this.listeners.get(repoUrl)!.add(callback);
        
        // replay history for late joiners
        const history = this.lastEvents.get(repoUrl) || [];
        for (const event of history) {
            callback(event);
        }

        return () => {
            const set = this.listeners.get(repoUrl);
            if (set) {
                set.delete(callback);
            }
        };
    }

    async publish(repoUrl: string, data: any): Promise<void> {
        const history = this.lastEvents.get(repoUrl);
        if (history) {
            history.push(data);
        }

        const set = this.listeners.get(repoUrl);
        if (set) {
            // Need to create an array to avoid issues if listeners remove themselves during iteration
            const callbacks = Array.from(set);
            for (const cb of callbacks) {
                try {
                    cb(data);
                } catch (e) {
                    console.error('Error in progress listener', e);
                }
            }
        }
    }
}

// Export a singleton instance. This can be replaced with a Redis-backed implementation later.
export const lockManager: ProjectLockManager = new InMemoryLockManager();
