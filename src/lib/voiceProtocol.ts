import { ASSISTANT_ACTION_TYPES, ASSISTANT_TEXT_LIMIT } from './assistantActions.ts';
export function pcmBase64(samples: Float32Array): string {
    const bytes = new Uint8Array(samples.length * 2);
    const view = new DataView(bytes.buffer);
    samples.forEach((sample, i) => view.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)), true));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}
export function decodePcm(base64: string): Float32Array {
    const binary = atob(base64);
    if (binary.length % 2 || binary.length > 1024 * 1024) throw new Error('Invalid audio frame.');
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    return Float32Array.from({ length: bytes.length / 2 }, (_, i) => view.getInt16(i * 2, true) / 32768);
}

export const ASSISTANT_SCREENS = ['dashboard', 'monitor', 'reports', 'calendar', 'timetable', 'community', 'ai', 'billing', 'overview', 'writing', 'flow', 'tasks', 'timeline'] as const;
export type AssistantScreen = typeof ASSISTANT_SCREENS[number];
export type VoiceDecision = 'apply' | 'cancel';
export function parseVoiceDecision(value: unknown): VoiceDecision {
    const decision = (value as { decision?: unknown })?.decision;
    if (decision !== 'apply' && decision !== 'cancel') throw new Error('Invalid decision.');
    return decision;
}
export function parseVoiceScreen(value: unknown): AssistantScreen {
    const screen = (value as { screen?: unknown })?.screen;
    if (typeof screen !== 'string' || !(ASSISTANT_SCREENS as readonly string[]).includes(screen)) throw new Error('Unknown screen.');
    return screen as AssistantScreen;
}

export type VoiceProposal = { reply: string; actions: import('./assistantActions').AssistantAction[] };
export function parseVoiceProposal(value: unknown): VoiceProposal {
    const item = value as VoiceProposal;
    if (!item || typeof item.reply !== 'string' || item.reply.length > 12000 || !Array.isArray(item.actions) || item.actions.length < 1 || item.actions.length > 8) throw new Error('Invalid voice action proposal.');
    for (const action of item.actions) {
        if (!action || !(ASSISTANT_ACTION_TYPES as readonly string[]).includes(action.type) || ['text', 'date', 'time', 'taskId'].some(key => typeof action[key as keyof typeof action] !== 'string' || String(action[key as keyof typeof action]).length > (key === 'text' ? ASSISTANT_TEXT_LIMIT : 1000)) || (action.repeat !== undefined && !['once', 'daily', 'weekdays', 'weekly'].includes(action.repeat))) throw new Error('Invalid voice action.');
    }
    if (item.actions.some(action => action.type === 'open_screen' && !(ASSISTANT_SCREENS as readonly string[]).includes(action.text))) throw new Error('Unknown screen.');
    return item;
}
