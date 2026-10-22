/** Preserve messages received live while an older history request was in flight. */
export function mergeChatMessages<T extends { id: number }>(history: T[], live: T[]): T[] {
    const messages = new Map<number, T>();
    for (const message of live) messages.set(message.id, message);
    for (const message of history) messages.set(message.id, message);
    return [...messages.values()].sort((a, b) => a.id - b.id);
}
