import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Mic, MicOff, Settings2, MessageSquare, Bell, MoreHorizontal, ChevronDown } from 'lucide-react';
import { LiveVoiceClient, type VoiceState } from '../lib/liveVoiceClient';
import type { VoiceProposal } from '../lib/voiceProtocol';
import { API_BASE_URL } from '../constants';
import AssistantPresence from './AssistantPresence';
import { WakeWordListener, type WakeRecognition, type WakeStatus } from '../lib/wakeWord';

export default function AssistantLiveVoice({ provider, name, context, onTranscript, onProposal, onActive, onWakeActive, controllerRef, model, motionEnabled, hidden, ready, disabled, onOpen, launcherRef }: {
    onWakeActive: (active:boolean) => void;
    model: string; motionEnabled: boolean; hidden: boolean; ready: boolean; disabled: boolean;
    onOpen: (section: 'settings' | 'chat' | 'reminders') => void;
    launcherRef: React.RefObject<HTMLButtonElement>;
    provider: string; name: string; context: () => Promise<string>;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onProposal: (proposal: VoiceProposal) => void; onActive: (active: boolean) => void;
    controllerRef: React.MutableRefObject<LiveVoiceClient | null>;
}) {
    const { getToken } = useAuth();
    const [state, setState] = useState<VoiceState>('idle');
    const [level, setLevel] = useState(0);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [menu, setMenu] = useState(false);
    const [wakeStatus, setWakeStatus] = useState<WakeStatus>('off');
    const wake = useRef<WakeWordListener | null>(null);
    const preparedAudio = useRef<AudioContext | null>(null);
    const wakeCallback = useRef(onWakeActive);
    useEffect(() => { wakeCallback.current = onWakeActive; }, [onWakeActive]);
    const stopWake = () => {
        wake.current?.stop(); wake.current = null;
        const audio = preparedAudio.current; preparedAudio.current = null;
        if (audio) void audio.close().catch(() => {});
        setWakeStatus('off'); wakeCallback.current(false);
    };
    useEffect(() => {
        const stop = () => {
            wake.current?.stop(); wake.current = null;
            const audio = preparedAudio.current; preparedAudio.current = null;
            if (audio) void audio.close().catch(() => {});
            setWakeStatus('off'); wakeCallback.current(false);
        };
        const leave = () => { if (document.hidden) { stop(); controllerRef.current?.stop(); } };
        const pageLeave = () => { stop(); controllerRef.current?.stop(); };
        document.addEventListener('visibilitychange', leave);
        window.addEventListener('pagehide', pageLeave);
        return () => { stop(); document.removeEventListener('visibilitychange', leave); window.removeEventListener('pagehide', pageLeave); };
    }, [name, ready, hidden, disabled, controllerRef]);
    const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
    const held = useRef(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const clearHold = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
    useEffect(() => () => { if (hold.current) clearTimeout(hold.current); }, []);
    useEffect(() => { if (menu) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [menu]);
    const openSection = (section: 'settings' | 'chat' | 'reminders') => { stopWake(); setMenu(false); onOpen(section); };
    const activeCallback = useRef(onActive);
    useEffect(() => { activeCallback.current = onActive; }, [onActive]);
    useEffect(() => () => { controllerRef.current?.stop(); controllerRef.current = null; activeCallback.current(false); }, [controllerRef]);
    const start = (initialRequest?:string, audioContext?:AudioContext) => {
        stopWake();
        if (controllerRef.current || !ready || disabled || document.hidden) { if(audioContext) void audioContext.close().catch(() => {}); return; }
        setError(''); window.speechSynthesis?.cancel(); onActive(true);
        const client = new LiveVoiceClient({ provider, initialRequest, audioContext,
            createSession: async signal => {
                const snapshot = await context();
                if (signal.aborted) throw new Error('Voice session cancelled.');
                const token = await getToken();
                const response = await fetch(`${API_BASE_URL}/api/assistant/voice/session`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider, model: model.trim(), name, context: snapshot }) });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || 'Could not create a voice session.');
                return data;
            },
            onState: next => { setState(next); if (next === 'idle') { controllerRef.current = null; activeCallback.current(false); } },
            onLevel: setLevel, onTranscript, onProposal, onError: setError,
        });
        controllerRef.current = client; void client.start();
    };
    const startRef = useRef(start);
    useEffect(() => { startRef.current = start; });
    const enableWake = async () => {
        if (wakeStatus !== 'off') { stopWake(); return; }
        if (!ready || disabled || controllerRef.current) return;
        const speechWindow = window as unknown as { SpeechRecognition?:new()=>WakeRecognition; webkitSpeechRecognition?:new()=>WakeRecognition };
        const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
        if (!Recognition || !window.isSecureContext) { setError('Wake listening is unavailable in this browser. Use tap to talk.'); return; }
        stopWake(); setError(''); window.speechSynthesis?.cancel();
        let audio:AudioContext;
        try { audio = new AudioContext({sampleRate:16000}); preparedAudio.current=audio; setWakeStatus('starting'); wakeCallback.current(true); await audio.resume(); }
        catch { stopWake(); setError('Could not prepare microphone audio. Try tap to talk.'); return; }
        if (preparedAudio.current !== audio) return;
        const listener = new WakeWordListener(() => new Recognition(), name, {
            onState: setWakeStatus,
            onError: message => { stopWake(); setError(message); },
            onWake: request => {
                const prepared = preparedAudio.current; preparedAudio.current = null;
                wake.current = null; wakeCallback.current(false); setExpanded(true);
                startRef.current(request, prepared || undefined);
            },
        });
        wake.current=listener; listener.start();
    };
    const tap = () => {
        if (held.current) { held.current = false; return; }
        setMenu(false);
        if (!expanded) { setExpanded(true); return; }
        if (state !== 'idle') { controllerRef.current?.stop(); return; }
        if (!ready) { openSection('settings'); return; }
        start();
    };
    const label = state === 'idle' ? 'Tap to talk' : state === 'connecting' ? 'Connecting…' : state === 'muted' ? 'Microphone muted' : state === 'speaking' ? 'Speaking' : 'Listening';
    return <section className={`agent-dock ${expanded ? 'expanded' : 'collapsed'}`} hidden={hidden} aria-label={`${name} voice agent`} onKeyDown={event => {
        if (event.key === 'Escape') { setMenu(false); setExpanded(false); stopWake(); controllerRef.current?.stop(); launcherRef.current?.focus(); }
    }}>
        {menu && <div className="agent-options" ref={menuRef} role="group" aria-label="Agent options">
            <button onClick={() => openSection('settings')}><Settings2 size={17} />Settings</button>
            <button onClick={() => openSection('chat')}><MessageSquare size={17} />Conversation</button>
            <button onClick={() => openSection('reminders')}><Bell size={17} />Reminders</button>
            <button onClick={() => { setMenu(false); launcherRef.current?.focus(); }}>Close options</button>
        </div>}
        <button ref={launcherRef} className={`${expanded ? 'agent-orb' : 'agent-pill'} ${state}`} disabled={disabled} aria-label={`${name}: ${!expanded ? 'expand voice agent' : state === 'idle' ? 'start conversation' : 'end conversation'}. Hold for options.`} aria-describedby={expanded ? 'agent-gesture-hint' : undefined}
            onClick={tap} onContextMenu={event => { event.preventDefault(); clearHold(); held.current = true; setMenu(true); }}
            onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); setMenu(true); } }}
            onPointerDown={event => {
                if (event.button !== 0) return;
                held.current = false; clearHold();
                hold.current = setTimeout(() => { held.current = true; setMenu(true); }, 550);
            }} onPointerUp={clearHold} onPointerLeave={clearHold} onPointerCancel={() => { clearHold(); held.current = true; }}>
            {expanded ? <AssistantPresence state={state} level={level} paused={!motionEnabled || hidden} /> : <><span className="agent-three-dots" aria-hidden="true"><i /><i /><i /></span><span>{state === 'idle' ? name : label}</span></>}
        </button>
        {expanded && <button className="agent-rename-hint" title="Change the name of the AI according to your choice" onClick={() => openSection('settings')}>(change AI name)</button>}
        {expanded && <><strong className="agent-name">{name}</strong><small className="sasha-voice-credit-note">10 sessions daily · 1 credit per start · up to 3 min. Refills 00:00 UTC / 5:30 AM India.</small><span className="agent-status" role="status">{label}</span>
        <div className="agent-quick-controls">
            {state !== 'idle' && <button disabled={state === 'connecting'} aria-label={state === 'muted' ? 'Unmute microphone' : 'Mute microphone'} onClick={() => controllerRef.current?.setMuted(state !== 'muted')}>{state === 'muted' ? <MicOff size={16} /> : <Mic size={16} />}</button>}
            <button aria-label="Agent options" aria-expanded={menu} onClick={() => setMenu(value => !value)}><MoreHorizontal size={19} /></button>
        </div>
        <button aria-label="Minimise agent" onClick={() => { controllerRef.current?.stop(); setMenu(false); setExpanded(false); }}><ChevronDown size={16} /></button>
        <small id="agent-gesture-hint">{state === 'idle' ? 'Hold for options' : 'Tap circle to end'}</small></>}
        {(expanded || menu || wakeStatus !== 'off') && <div className="agent-wake-control">
            <button disabled={!ready || disabled || state !== 'idle'} aria-pressed={wakeStatus !== 'off'} onClick={() => void enableWake()}>{wakeStatus === 'off' ? 'Enable “Hey Sasha”' : 'Stop wake listening'}</button>
            <span role="status">{wakeStatus === 'listening' ? 'Listening for “Hey Sasha”' : wakeStatus === 'starting' ? 'Starting wake listener…' : ''}</span>
            {(expanded || menu) && <small>One conversation per activation, in this tab. Browser speech recognition may process audio online. You can also say “Hey {name}”.</small>}
        </div>}
        {error && <div className="agent-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    </section>;
}
