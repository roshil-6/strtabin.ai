/** Throttle streaming updates to reduce lag on slow devices (max ~20 updates/sec) */
function throttleStreamCallback(cb: (text: string) => void, intervalMs = 50): (text: string, isFinal?: boolean) => void {
    let pending: string | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastCall = 0;
    const flush = (text: string) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        pending = null;
        lastCall = Date.now();
        cb(text);
    };
    return (text: string, isFinal?: boolean) => {
        if (isFinal) {
            flush(text);
            return;
        }
        const now = Date.now();
        if (now - lastCall >= intervalMs) {
            flush(text);
        } else {
            pending = text;
            if (!timeoutId) {
                timeoutId = setTimeout(() => pending != null && flush(pending!), intervalMs - (now - lastCall));
            }
        }
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const sendGeneralStrabMessage = async (
    _messages: ChatMessage[],
    onChunk: (accumulated: string) => void,
    _authToken?: string,
    _signal?: AbortSignal,
): Promise<string> => {
    const maintenanceMessage = '🔧 AI is under maintenance\n\nWe are working on integrating a more powerful AI system for an upcoming major project. Please check back later!';
    // Simulate streaming callback to show message
    const throttled = throttleStreamCallback(onChunk);
    throttled(maintenanceMessage, true);
    throw new Error('AI operations are currently under maintenance.');
};

/**
 * Strip machine-only [ACTIONS] blocks from text shown in chat.
 * - streaming: hide everything from first `[ACTIONS]` so JSON never flashes (ChatGPT-style).
 * - final: remove closed blocks and any unclosed `[ACTIONS]…` tail.
 */
export function strabVisibleAssistantText(raw: string, mode: 'streaming' | 'final'): string {
    if (!raw) return '';
    if (mode === 'streaming') {
        const i = raw.indexOf('[ACTIONS]');
        if (i !== -1) return raw.slice(0, i).trimEnd();
        return raw;
    }
    let s = raw.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/gi, '').trim();
    const j = s.indexOf('[ACTIONS]');
    if (j !== -1) s = s.slice(0, j).trimEnd();
    return s.replace(/\[\s*\/\s*ACTIONS\s*\]\s*$/gi, '').trim();
}

export interface ProjectContext {
    name: string;
    nodes?: number;
    edges?: number;
    todos?: Array<{ id: string; text: string; completed: boolean }>;
    lastUpdated?: string;
    nodeLabels?: (string | undefined)[];
    writingContent?: string;
    /** When true, STRAB should populate the canvas via [ACTIONS] if the user asks to build a strategy */
    canvasIsBlank?: boolean;
}

export const sendStrabMessage = async (
    _messages: ChatMessage[],
    _projectContext: ProjectContext,
    _authToken?: string
): Promise<string> => {
    const maintenanceMessage = '🔧 AI is under maintenance\n\nWe are working on integrating a more powerful AI system for an upcoming major project. Please check back later!';
    throw new Error(maintenanceMessage);
};

/**
 * Streaming variant — UNDER MAINTENANCE
 */
export const sendStrabMessageStreaming = async (
    _messages: ChatMessage[],
    _projectContext: ProjectContext,
    onChunk: (accumulated: string) => void,
    _authToken?: string,
    _signal?: AbortSignal,
): Promise<string> => {
    const maintenanceMessage = '🔧 AI is under maintenance\n\nWe are working on integrating a more powerful AI system for an upcoming major project. Please check back later!';
    const throttled = throttleStreamCallback(onChunk);
    throttled(maintenanceMessage, true);
    throw new Error('AI operations are currently under maintenance.');
};
