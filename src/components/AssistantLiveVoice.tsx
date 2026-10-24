import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Mic, MicOff, Settings2, MessageSquare, Bell, MoreHorizontal } from 'lucide-react';
import { LiveVoiceClient, type VoiceState } from '../lib/liveVoiceClient';
import type { VoiceProposal } from '../lib/voiceProtocol';
import { API_BASE_URL } from '../constants';
import AssistantPresence from './AssistantPresence';

export default function AssistantLiveVoice({ provider, apiKey, name, context, onTranscript, onProposal, onActive, controllerRef, model, motionEnabled, hidden, ready, disabled, onOpen, launcherRef }: {
    model: string; motionEnabled: boolean; hidden: boolean; ready: boolean; disabled: boolean;
    onOpen: (section: 'settings' | 'chat' | 'reminders') => void;
    launcherRef: React.RefObject<HTMLButtonElement>;
    provider: string; apiKey: string; name: string; context: () => Promise<string>;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onProposal: (proposal: VoiceProposal) => void; onActive: (active: boolean) => void;
    controllerRef: React.MutableRefObject<LiveVoiceClient | null>;
}) {
    const { getToken } = useAuth();
    const [state, setState] = useState<VoiceState>('idle');
    const [level, setLevel] = useState(0);
    const [error, setError] = useState('');
    const [menu, setMenu] = useState(false);
    const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
    const held = useRef(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const clearHold = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
    useEffect(() => () => { if (hold.current) clearTimeout(hold.current); }, []);
    useEffect(() => { if (menu) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [menu]);
    const openSection = (section: 'settings' | 'chat' | 'reminders') => { setMenu(false); onOpen(section); };
    const activeCallback = useRef(onActive);
    useEffect(() => { activeCallback.current = onActive; }, [onActive]);
    useEffect(() => () => { controllerRef.current?.stop(); controllerRef.current = null; activeCallback.current(false); }, [controllerRef]);
    const start = () => {
        if (controllerRef.current || !apiKey || disabled) return;
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
    const tap = () => {
        if (held.current) { held.current = false; return; }
        setMenu(false);
        if (state !== 'idle') { controllerRef.current?.stop(); return; }
        if (!ready) { openSection('settings'); return; }
        start();
    };
    const label = state === 'idle' ? 'Tap to talk' : state === 'connecting' ? 'Connecting…' : state === 'muted' ? 'Microphone muted' : state === 'speaking' ? 'Speaking' : 'Listening';
    return <section className="agent-dock" hidden={hidden} aria-label={`${name} voice agent`} onKeyDown={event => {
        if (event.key === 'Escape') { setMenu(false); controllerRef.current?.stop(); launcherRef.current?.focus(); }
    }}>
        {menu && <div className="agent-options" ref={menuRef} role="group" aria-label="Agent options">
            <button onClick={() => openSection('settings')}><Settings2 size={17} />Settings</button>
            <button onClick={() => openSection('chat')}><MessageSquare size={17} />Conversation</button>
            <button onClick={() => openSection('reminders')}><Bell size={17} />Reminders</button>
            <button onClick={() => { setMenu(false); launcherRef.current?.focus(); }}>Close options</button>
        </div>}
        <button ref={launcherRef} className={`agent-orb ${state}`} disabled={disabled} aria-label={`${name}: ${state === 'idle' ? 'start conversation' : 'end conversation'}. Hold for options.`} aria-describedby="agent-gesture-hint"
            onClick={tap} onContextMenu={event => { event.preventDefault(); clearHold(); held.current = true; setMenu(true); }}
            onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); setMenu(true); } }}
            onPointerDown={event => {
                if (event.button !== 0) return;
                held.current = false; clearHold();
                hold.current = setTimeout(() => { held.current = true; setMenu(true); }, 550);
            }} onPointerUp={clearHold} onPointerLeave={clearHold} onPointerCancel={() => { clearHold(); held.current = true; }}>
            <AssistantPresence state={state} level={level} paused={!motionEnabled || hidden} />
        </button>
        <strong className="agent-name">{name}</strong><span className="agent-status" role="status">{label}</span>
        <div className="agent-quick-controls">
            {state !== 'idle' && <button disabled={state === 'connecting'} aria-label={state === 'muted' ? 'Unmute microphone' : 'Mute microphone'} onClick={() => controllerRef.current?.setMuted(state !== 'muted')}>{state === 'muted' ? <MicOff size={16} /> : <Mic size={16} />}</button>}
            <button aria-label="Agent options" aria-expanded={menu} onClick={() => setMenu(value => !value)}><MoreHorizontal size={19} /></button>
        </div>
        <small id="agent-gesture-hint">{state === 'idle' ? 'Hold for options' : 'Tap circle to end'}</small>
        {error && <div className="agent-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    </section>;
}
