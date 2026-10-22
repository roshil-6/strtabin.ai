/** Deduplicate only simultaneous requests from the same authenticated session. */
export class ScopedRequestPool<T> {
    private scopes = new Map<string | null, Map<number, Promise<T>>>();
    run(scope: string | null, id: number, load: () => Promise<T>): Promise<T> {
        let requests = this.scopes.get(scope);
        if (!requests) { requests = new Map(); this.scopes.set(scope, requests); }
        const existing = requests.get(id);
        if (existing) return existing;
        const request = Promise.resolve().then(load);
        requests.set(id, request);
        const cleanup = () => {
            if (requests.get(id) === request) requests.delete(id);
            if (!requests.size && this.scopes.get(scope) === requests) this.scopes.delete(scope);
        };
        void request.then(cleanup, cleanup);
        return request;
    }
}
