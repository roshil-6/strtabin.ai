export type SaveStatus = 'pending' | 'saving' | 'saved' | 'error';
type Entry<T> = { payload: T; version: number; status: SaveStatus; error?: string; timer?: ReturnType<typeof setTimeout>; running: boolean };

/** Serializes writes per project so a slow older response cannot overwrite newer edits. */
export class ProjectSaveQueue<T> {
    private entries = new Map<string, Entry<T>>();
    private disposed = false;
    private save: (id: string, payload: T) => Promise<unknown>;
    private changed: () => void;
    private delay: number;

    constructor(save: (id: string, payload: T) => Promise<unknown>, changed: () => void, delay = 1000) {
        this.save = save;
        this.changed = changed;
        this.delay = delay;
    }

    enqueue(id: string, payload: T) {
        if (this.disposed) return;
        const previous = this.entries.get(id);
        if (previous?.timer) clearTimeout(previous.timer);
        const entry: Entry<T> = {
            payload, version: (previous?.version ?? 0) + 1,
            status: previous?.running ? 'saving' : 'pending', running: previous?.running ?? false,
        };
        this.entries.set(id, entry);
        if (!entry.running) entry.timer = setTimeout(() => { void this.flush(id); }, this.delay);
        this.changed();
    }

    pendingIds() { return [...this.entries].filter(([, entry]) => entry.status !== 'saved').map(([id]) => id); }
    failures() { return [...this.entries].filter(([, entry]) => entry.status === 'error').map(([id, entry]) => ({ id, error: entry.error })); }

    async flush(id: string): Promise<void> {
        const entry = this.entries.get(id);
        if (this.disposed || !entry || entry.running || entry.status === 'saved') return;
        if (entry.timer) clearTimeout(entry.timer);
        entry.running = true;
        entry.status = 'saving';
        this.changed();
        try {
            await this.save(id, entry.payload);
            if (this.disposed) return;
            const latest = this.entries.get(id)!;
            latest.running = false;
            if (latest.version !== entry.version) {
                latest.status = 'pending';
                await this.flush(id);
            } else {
                latest.status = 'saved';
                this.changed();
            }
        } catch (error) {
            if (this.disposed) return;
            const latest = this.entries.get(id)!;
            latest.running = false;
            latest.status = 'error';
            latest.error = error instanceof Error ? error.message : 'Could not save changes.';
            this.changed();
        }
    }

    retryAll() { return Promise.all(this.pendingIds().map(id => this.flush(id))); }

    dispose() {
        this.disposed = true;
        for (const entry of this.entries.values()) if (entry.timer) clearTimeout(entry.timer);
    }
}
