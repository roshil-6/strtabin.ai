const key = (userId: string) => `stratabin-pending-projects:${userId}`;

// Payloads already live in the persisted canvas store; keep only IDs in the outbox.
export function pendingProjectIds(userId: string): string[] {
    try {
        const ids: unknown = JSON.parse(localStorage.getItem(key(userId)) || '[]');
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && /^proj_\d+$/.test(id)) : [];
    } catch { return []; }
}

export function persistPendingProjects(userId: string, ids: string[]) {
    localStorage.setItem(key(userId), JSON.stringify(ids));
}
