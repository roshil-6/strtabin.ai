/** Throttle streaming updates to reduce lag on slow devices (max ~20 updates/sec) */
function throttleStreamCallback(cb: (text: string) => void, intervalMs = 50): (text: string, isFinal?: boolean) => void {
    let pending: string | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastCall = 0;
    const flush = (text: string) => {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        pending = null;
        lastCall = Date.now();
        cb(text);
    };
    return (text: string, isFinal?: boolean) => {
        if (isFinal) { flush(text); return; }
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
    canvasIsBlank?: boolean;
    workspaceId?: number;
    // Allow any additional context fields the caller may include
    [key: string]: unknown;
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

/** Streaming variant */
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

// ─────────────────────────────────────────────────────────────────────────────
// STRAB SMART ROUTING  (GPT-4 first — Claude only when truly unavoidable)
//
// Claude (Anthropic) fires ONLY for:
//   • The very first message from the Flow Builder wizard (bootstraps the canvas
//     with nodes, connections, and tasks from the user's full project brief).
//
// GPT-4 (OpenAI) handles EVERYTHING else:
//   • All regular chat, Q&A, clarifications, status checks
//   • Reports, analyses, writing, task suggestions
//   • Follow-up questions after the initial project setup
//
// Rationale: Claude credits are expensive. GPT-4 is fast and capable for 95%
// of STRAB interactions. Reserve Claude's deeper reasoning for the one moment
// where it genuinely matters — bootstrapping a brand-new project canvas.
// ─────────────────────────────────────────────────────────────────────────────

/** The exact trigger phrase sent by FlowProjectCreator.tsx */
const FLOW_BUILDER_TRIGGER = 'I just created a new project.';

/**
 * selectProvider — picks the AI engine for each STRAB message.
 *
 * @param userMessage  The user's raw message string.
 * @param chatLength   Total messages in the conversation so far (before this one).
 * @returns 'anthropic' (Claude) only for the Flow Builder initial brief;
 *          'openai' (GPT-4) for everything else.
 */
export function selectProvider(
    userMessage: string,
    chatLength = 1
): 'openai' | 'anthropic' {
    // Only use Claude for the Flow Builder kick-off message
    if (userMessage.trimStart().startsWith(FLOW_BUILDER_TRIGGER)) return 'anthropic';

    // GPT-4 for everything else — fast, cheap, and capable
    return 'openai';
}
