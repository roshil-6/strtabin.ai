import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { LiveVoiceClient, type VoiceState } from '../lib/liveVoiceClient';
import type { VoiceProposal } from '../lib/voiceProtocol';
import { API_BASE_URL } from '../constants';
import AssistantPresence from './AssistantPresence';

export default function AssistantLiveVoice({ provider, apiKey, name, context, onTranscript, onProposal, onActive, controllerRef }: {
    provider: string; apiKey: string; name: string; context: () => Promise<string>;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onProposal: (proposal: VoiceProposal) => void; onActive: (active: boolean) => void;
    controllerRef: React.MutableRefObject<LiveVoiceClient | null>;
}) {
    const { getToken } = useAuth();
    const [state, setState] = useState<VoiceState>('idle');
    const [level, setLevel] = useState(0);
    const [error, setError] = useState('');
    const [model, setModel] = useState(provider === 'openai' ? 'gpt-realtime' : 'gemini-3.8-live');
    const activeCallback = useRef(onActive);
    useEffect(() => { activeCallback.current = onActive; }, [onActive]);
    useEffect(() => () => { controllerRef.current?.stop(); controllerRef.current = null; activeCallback.current(false); }, [controllerRef]);
    const start = () => {
        if (controllerRef.current || !apiKey) return;
        setError(''); window.speechSynthesis?.cancel(); onActive(true);
        const client = new LiveVoiceClient({ provider,
            createSession: async signal => {
                const snapshot = await context();
                if (signal.aborted) throw new Error('Voice session cancelled.');
                const token = await getToken();
                const response = await fetch(`${API_BASE_URL}/api/assistant/voice/session`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider, apiKey: apiKey.trim(), model: model.trim(), name, context: snapshot }) });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || 'Could not create a voice session.');
                return data;
            },
            onState: next => { setState(next); if (next === 'idle') { controllerRef.current = null; activeCallback.current(false); } },
            onLevel: setLevel, onTranscript, onProposal, onError: setError,
        });
        controllerRef.current = client; void client.start();
    };
    return <section className="assistant-live" aria-label="Live conversation"><AssistantPresence state={state} level={level} /><h3>Think out loud.</h3><p>Talk naturally about your selected project. Your microphone streams directly to {provider === 'openai' ? 'OpenAI' : 'Gemini'}; replies use an AI-generated voice.</p><label>Voice model<input value={model} disabled={state !== 'idle'} maxLength={100} onChange={event => setModel(event.target.value)} /></label><small>Voice uses a separate model from text chat. Availability depends on your API account.</small><div className="assistant-live-controls">{state === 'idle' ? <button className="assistant-primary" disabled={!apiKey || !model.trim()} onClick={start}><Phone size={18} />Start conversation</button> : <><button onClick={() => controllerRef.current?.setMuted(state !== 'muted')} disabled={state === 'connecting'}>{state === 'muted' ? <Mic size={18} /> : <MicOff size={18} />}{state === 'muted' ? 'Unmute' : 'Mute'}</button><button className="assistant-end-call" onClick={() => { controllerRef.current?.stop(); controllerRef.current = null; }}><PhoneOff size={18} />End conversation</button></>}</div><small>Interrupt naturally while speaking. Sessions end after nine minutes. Closing the panel, switching sections or signing out stops the microphone. API usage is billed by your provider.</small>{error && <p role="alert" className="assistant-error">{error}</p>}</section>;
}
