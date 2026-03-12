import { API_BASE_URL } from '../constants';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const sendGeneralStrabMessage = async (
    messages: ChatMessage[],
    onChunk: (accumulated: string) => void,
    authToken?: string,
    signal?: AbortSignal,
): Promise<string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}/api/strab-general`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, stream: true }),
        signal,
    });

    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
                const evt = JSON.parse(payload);
                if (evt.error) throw new Error(evt.error);
                if (evt.t) { accumulated += evt.t; onChunk(accumulated); }
            } catch (e) {
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
            }
        }
    }

    return accumulated;
};

export interface ProjectContext {
    name: string;
    nodes?: number;
    edges?: number;
    todos?: Array<{ id: string; text: string; completed: boolean }>;
    lastUpdated?: string;
    nodeLabels?: (string | undefined)[];
    writingContent?: string;
}

export const sendStrabMessage = async (
    messages: ChatMessage[],
    projectContext: ProjectContext,
    authToken?: string
): Promise<string> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, projectContext }),
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
};

/**
 * Streaming variant — calls the same endpoint with `stream: true`.
 * Invokes `onChunk` with the accumulated text so far on every delta.
 * Returns the full text once complete.
 */
export const sendStrabMessageStreaming = async (
    messages: ChatMessage[],
    projectContext: ProjectContext,
    onChunk: (accumulated: string) => void,
    authToken?: string,
    signal?: AbortSignal,
): Promise<string> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, projectContext, stream: true }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;

            try {
                const evt = JSON.parse(payload);
                if (evt.error) throw new Error(evt.error);
                if (evt.t) {
                    accumulated += evt.t;
                    onChunk(accumulated);
                }
            } catch (e) {
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                    throw e;
                }
            }
        }
    }

    return accumulated;
};
