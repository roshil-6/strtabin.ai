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
    messages: ChatMessage[],
    onChunk: (accumulated: string) => void,
    authToken?: string,
    signal?: AbortSignal,
    provider: 'openai' | 'anthropic' = 'anthropic'
): Promise<string> => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/api/strab-general`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ messages, provider }),
        signal
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulated = '';
    const throttled = throttleStreamCallback(onChunk);

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') break;
                try {
                    const data = JSON.parse(dataStr);
                    if (data.error) throw new Error(data.error);
                    if (data.text) accumulated += data.text;
                    throttled(accumulated);
                } catch { /* ignore partial JSON */ }
            }
        }
    }
    throttled(accumulated, true);
    return accumulated;
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
    messages: ChatMessage[],
    projectContext: ProjectContext,
    authToken?: string,
    provider: 'openai' | 'anthropic' = 'anthropic'
): Promise<string> => {
    let acc = '';
    await sendStrabMessageStreaming(messages, projectContext, t => { acc = t; }, authToken, undefined, provider);
    return acc;
};

/**
 * Streaming variant
 */
export const sendStrabMessageStreaming = async (
    messages: ChatMessage[],
    projectContext: ProjectContext,
    onChunk: (accumulated: string) => void,
    authToken?: string,
    signal?: AbortSignal,
    provider: 'openai' | 'anthropic' = 'anthropic'
): Promise<string> => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ messages, context: projectContext, provider }),
        signal
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulated = '';
    const throttled = throttleStreamCallback(onChunk);

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') break;
                try {
                    const data = JSON.parse(dataStr);
                    if (data.error) throw new Error(data.error);
                    if (data.text) accumulated += data.text;
                    throttled(accumulated);
                } catch { /* ignore partial JSON */ }
            }
        }
    }
    throttled(accumulated, true);
    return accumulated;
};
