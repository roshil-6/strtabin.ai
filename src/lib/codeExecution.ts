export const executableLanguages = new Set(['python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'rust', 'go']);
export type RunOutput = { stdout: string; stderr: string; code: number };

export async function requestExecution(url: string, file: { name: string; language: string; content: string }, token: string | null, signal: AbortSignal, stdin = ''): Promise<RunOutput> {
    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST', signal,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ language: file.language, files: [{ name: file.name, content: file.content }], stdin }),
        });
    } catch (error) {
        if (signal.aborted) throw new Error('Execution stopped or timed out. You can run the file again.');
        throw new Error(error instanceof TypeError ? 'Cannot reach the backend. It may be offline or suspended. Your code is still saved; try again when the service is available.' : 'Unable to start this run. Please try again.');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `The backend returned an error (${response.status}). Please try again later.`);
    if (!data?.run || typeof data.run.stdout !== 'string' || typeof data.run.stderr !== 'string' || typeof data.run.code !== 'number') {
        throw new Error('The backend returned an invalid execution response.');
    }
    return data.run;
}
