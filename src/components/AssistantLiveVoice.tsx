import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Settings2, MessageSquare, Bell, MoreHorizontal, ChevronDown, Activity, BarChart2, Pencil, PhoneOff, Info, Check, X, Timer } from 'lucide-react';
import { LiveVoiceClient, type VoiceState } from '../lib/liveVoiceClient';
import type { VoiceProposal, VoiceDecision, AssistantScreen } from '../lib/voiceProtocol';

const SESSION_LIMIT = 10;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
import { API_BASE_URL } from '../constants';
import AssistantPresence from './AssistantPresence';
import { WakeWordListener, type WakeRecognition, type WakeStatus } from '../lib/wakeWord';

export default function AssistantLiveVoice({ provider, name, context, onTranscript, onProposal, onActive, onWakeActive, controllerRef, model, motionEnabled, hidden, ready, disabled, onOpen, launcherRef, projectId, voiceRemaining, voiceLimit = SESSION_LIMIT, trial = false, onVoiceRemaining, pending, onApplyPending, onCancelPending, onDecision, onScreen }: {
    onWakeActive: (active:boolean) => void;
    model: string; motionEnabled: boolean; hidden: boolean; ready: boolean; disabled: boolean;
    onOpen: (section: 'settings' | 'chat' | 'reminders') => void;
    launcherRef: React.RefObject<HTMLButtonElement>;
    provider: string; name: string; context: () => Promise<string>;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onProposal: (proposal: VoiceProposal) => void; onActive: (active: boolean) => void;
    controllerRef: React.MutableRefObject<LiveVoiceClient | null>;
    projectId?: string;
    voiceRemaining?: number; voiceLimit?: number; trial?: boolean; onVoiceRemaining: (left: number) => void;
    pending: { lines: string[]; busy: boolean } | null; onApplyPending: () => void; onCancelPending: () => void;
    onDecision: (decision: VoiceDecision) => Promise<Record<string, unknown>>;
    onScreen: (screen: AssistantScreen) => Record<string, unknown>;
}) {
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const [state, setState] = useState<VoiceState>('idle');
    const [level, setLevel] = useState(0);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [menu, setMenu] = useState(false);
    const [wakeStatus, setWakeStatus] = useState<WakeStatus>('off');
    // Session countdown: the server caps each voice session; show what is left.
    const [deadline, setDeadline] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [deadline]);
    const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
    const handlers = useRef({ onDecision, onScreen, onVoiceRemaining });
    useEffect(() => { handlers.current = { onDecision, onScreen, onVoiceRemaining }; });
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
                if (typeof data.remaining === 'number') handlers.current.onVoiceRemaining(data.remaining);
                const seconds = Math.min(Number(data.maxSeconds) || 180, 540);
                setNow(Date.now()); setDeadline(Date.now() + seconds * 1000);
                return data;
            },
            onState: next => { setState(next); if (next === 'idle') { setDeadline(0); controllerRef.current = null; activeCallback.current(false); } },
            onLevel: setLevel, onTranscript, onProposal, onError: setError,
            onDecision: decision => handlers.current.onDecision(decision),
            onScreen: screen => handlers.current.onScreen(screen),
        });
        controllerRef.current = client; void client.start();
    };
    const startRef = useRef(start);
    useEffect(() => { startRef.current = start; });
    const enableWake = async () => {
        if (wakeStatus !== 'off') { stopWake(); return; }
        if (!ready) { setError('Sasha requires an active Pro subscription and backend configuration.'); return; }
        if (disabled || controllerRef.current) return;
        const speechWindow = window as unknown as { SpeechRecognition?:new()=>WakeRecognition; webkitSpeechRecognition?:new()=>WakeRecognition };
        const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
        if (!Recognition || !window.isSecureContext) { setError('Wake listening is unavailable in this browser. Use tap to talk.'); return; }
        stopWake(); setError(''); window.speechSynthesis?.cancel();
        let audio:AudioContext;
        try {
            try { audio = new AudioContext({sampleRate:16000}); }
            catch { audio = new AudioContext(); }
            preparedAudio.current=audio; setWakeStatus('starting'); wakeCallback.current(true); await audio.resume();
        }
        catch { stopWake(); setError('Could not prepare microphone audio. Try tap to talk.'); return; }
        if (preparedAudio.current !== audio) return;
        const listener = new WakeWordListener(() => new Recognition(), name, {
            onState: setWakeStatus,
            onError: message => { stopWake(); setError(message); },
            onWake: request => {
                const prepared = preparedAudio.current; preparedAudio.current = null;
                wake.current = null; wakeCallback.current(false); setExpanded(true);
                // Allow Windows / browser audio driver a 150ms buffer to release the mic handle
                setTimeout(() => {
                    startRef.current(request, prepared || undefined);
                }, 150);
            },
        });
        wake.current=listener; listener.start();
    };
    const toggleTalk = () => {
        setMenu(false);
        if (state !== 'idle') { controllerRef.current?.stop(); return; }
        if (!ready) { openSection('settings'); return; }
        start();
    };
    const tap = () => {
        if (held.current) { held.current = false; return; }
        if (!expanded) { setMenu(false); setExpanded(true); return; }
        toggleTalk();
    };
    const goTo = (path: string) => { stopWake(); setMenu(false); controllerRef.current?.stop(); navigate(path); };
    const reportsPath = projectId ? `/ai/${encodeURIComponent(projectId)}?tab=reports` : '/reports';
    const label = state === 'idle' ? 'Tap to talk' : state === 'connecting' ? 'Connecting…' : state === 'muted' ? 'Microphone muted' : state === 'speaking' ? 'Speaking' : 'Listening';
    const chip = state === 'idle' ? (wakeStatus === 'listening' ? 'Waiting' : 'Ready') : state === 'connecting' ? 'Connecting' : state === 'muted' ? 'Muted' : label;
    const hint = state === 'idle' ? (ready ? 'Tap the orb or press Start to talk' : 'Voice needs Pro access. Open settings to check.') : state === 'connecting' ? 'Connecting your microphone…' : 'Speak naturally. Tap the orb to end.';
    const wakeLabel = wakeStatus === 'listening' ? `Listening for “Hey ${name}”` : wakeStatus === 'starting' ? 'Starting wake listener…' : 'Start hands-free with your voice';
    const wakeSwitch = <div className={`agent-wake-control ${wakeStatus !== 'off' ? 'on' : ''}`}>
        <div><strong>“Hey {name}”</strong><span role="status">{wakeLabel}</span></div>
        <button type="button" role="switch" className="agent-switch" aria-checked={wakeStatus !== 'off'} aria-label={wakeStatus === 'off' ? `Enable “Hey ${name}”` : 'Stop wake listening'} disabled={disabled || state !== 'idle'} onClick={() => void enableWake()}><i aria-hidden="true" /></button>
    </div>;
    return <section className={`agent-dock ${expanded ? 'expanded' : 'collapsed'}`} hidden={hidden} aria-label={`${name} voice agent`} onKeyDown={event => {
        if (event.key === 'Escape') { setMenu(false); setExpanded(false); stopWake(); controllerRef.current?.stop(); launcherRef.current?.focus(); }
    }}>
        {expanded && <header className="agent-header">
            <button type="button" className="agent-name" title="Change the name of the AI" onClick={() => openSection('settings')}><span>{name}</span><Pencil size={12} aria-hidden="true" /></button>
            <span className={`agent-chip ${state}`}><i aria-hidden="true" />{chip}</span>
            <div className="agent-header-actions">
                <button type="button" aria-label="Agent options" aria-expanded={menu} title="Options" onClick={() => setMenu(value => !value)}><MoreHorizontal size={17} /></button>
                <button type="button" aria-label="Minimise agent" title="Minimise" onClick={() => { controllerRef.current?.stop(); setMenu(false); setExpanded(false); }}><ChevronDown size={17} /></button>
            </div>
        </header>}
        {menu && <div className="agent-options" ref={menuRef} role="group" aria-label="Agent options">
            <button type="button" onClick={() => openSection('settings')}><Settings2 size={16} />Settings</button>
            <button type="button" onClick={() => openSection('chat')}><MessageSquare size={16} />Conversation</button>
            <button type="button" onClick={() => openSection('reminders')}><Bell size={16} />Reminders</button>
            <button type="button" onClick={() => goTo('/dashboard?tab=monitor')}><Activity size={16} />Monitor work</button>
            <button type="button" onClick={() => goTo(reportsPath)}><BarChart2 size={16} />Project reports</button>
            <button type="button" onClick={() => { setMenu(false); launcherRef.current?.focus(); }}>Close options</button>
        </div>}
        <div className={expanded ? `agent-stage ${state}` : 'agent-pill-wrap'} style={expanded ? { '--agent-level': level } as React.CSSProperties : undefined}>
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
        </div>
        {expanded && <>
            <p id="agent-gesture-hint" className="agent-hint" role="status">{hint}</p>
            <div className="agent-usage" aria-label="Voice usage">
                {deadline > 0 && <span className={`agent-timer ${secondsLeft <= 30 ? 'low' : ''}`} title="Time left in this session"><Timer size={13} aria-hidden="true" />{clock(secondsLeft)} left</span>}
                {voiceRemaining !== undefined && <span className="agent-sessions" title={trial ? 'Free trial voice sessions left' : 'Voice sessions left today'}>
                    <span className="agent-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (voiceRemaining / Math.max(1, voiceLimit)) * 100)}%` }} /></span>
                    {voiceRemaining} of {voiceLimit} {trial ? 'free trial sessions left' : 'sessions left today'}
                </span>}
            </div>
            {pending && <div className="agent-plan" role="region" aria-label="Pending plan">
                <strong>Plan ready · {pending.lines.length} step{pending.lines.length === 1 ? '' : 's'}</strong>
                <ol>{pending.lines.map((line, index) => <li key={index}>{line}</li>)}</ol>
                <small>Say “yes, apply” or “cancel”, or tap below.</small>
                <div>
                    <button type="button" className="agent-plan-apply" disabled={pending.busy} onClick={onApplyPending}><Check size={15} />{pending.busy ? 'Applying…' : 'Apply'}</button>
                    <button type="button" disabled={pending.busy} onClick={onCancelPending}><X size={15} />Cancel</button>
                </div>
            </div>}
            <div className="agent-primary-row">
                {state !== 'idle' && <button type="button" className="agent-mute" disabled={state === 'connecting'} aria-label={state === 'muted' ? 'Unmute microphone' : 'Mute microphone'} title={state === 'muted' ? 'Unmute' : 'Mute'} onClick={() => controllerRef.current?.setMuted(state !== 'muted')}>{state === 'muted' ? <MicOff size={17} /> : <Mic size={17} />}</button>}
                <button type="button" className={`agent-primary ${state !== 'idle' ? 'end' : ''}`} disabled={disabled || state === 'connecting'} onClick={toggleTalk}>
                    {state === 'idle' ? <><Mic size={16} />Start talking</> : state === 'connecting' ? 'Connecting…' : <><PhoneOff size={16} />End</>}
                </button>
            </div>
            <nav className="agent-quick-links" aria-label="Shortcuts">
                <button type="button" onClick={() => openSection('chat')} title="Open the text conversation"><MessageSquare size={16} /><span>Chat</span></button>
                <button type="button" onClick={() => goTo('/dashboard?tab=monitor')} title="Open project monitor"><Activity size={16} /><span>Monitor</span></button>
                <button type="button" onClick={() => goTo(reportsPath)} title="Open project reports"><BarChart2 size={16} /><span>Reports</span></button>
            </nav>
            {wakeSwitch}
            <p className="agent-footnote"><Info size={12} aria-hidden="true" /><span>{trial ? `Each session is up to 3 min. Your free trial includes ${voiceLimit} sessions; Pro gives you ${SESSION_LIMIT} every day.` : `Each session is up to 3 min and uses 1 of your ${SESSION_LIMIT} daily sessions. Refills 00:00 UTC (5:30 AM India).`} Wake listening uses your browser’s speech recognition, which may process audio online.</span></p>
        </>}
        {!expanded && wakeStatus !== 'off' && wakeSwitch}
        {error && <div className="agent-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}
    </section>;
}
