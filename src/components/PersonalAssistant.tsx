import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, X, Send, Volume2, Square, Check, ArrowUpRight } from 'lucide-react';
import useStore from '../store/useStore';
import { useTimetables } from '../store/useTimetables';
import { buildProjectCapsule } from '../lib/projectCapsule';
import { API_BASE_URL } from '../constants';
import { isProjectFetchedFromServer } from '../hooks/useProjectLoader';
import { workspaceService } from '../services/workspaceService';
import { NotificationManager } from '../services/NotificationManager';
import VoiceTyping from './VoiceTyping';
import AssistantLiveVoice from './AssistantLiveVoice';
import AssistantReminders from './AssistantReminders';
import { reminderRequest, type ReminderStatus } from '../services/assistantReminders';
import type { LiveVoiceClient } from '../lib/liveVoiceClient';
import './PersonalAssistant.css';
import { planAssistantActions, undoAssistantActions, type AssistantAction, type AssistantUndo } from '../lib/assistantActions';

type Message = { id: string; role: 'user' | 'assistant'; text: string; actions?: AssistantAction[]; undo?: AssistantUndo; after?: string; projectId?: string; applied?: boolean };

export default function PersonalAssistant() {
    const { userId, isSignedIn } = useAuth();
    const location = useLocation();
    if (!isSignedIn || /^\/(auth|sso-callback)(\/|$)/.test(location.pathname) || location.pathname === '/') return null;
    return <AssistantSession key={userId} />;
}

function AssistantSession() {
    const { getToken, userId } = useAuth();
    const navigate = useNavigate();
    const canvases = useStore(state => state.canvases);
    const location = useLocation();
    const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('assistant') === 'reminders');
    const [tab, setTab] = useState<'chat' | 'settings' | 'reminders'>(() => new URLSearchParams(location.search).get('assistant') === 'reminders' ? 'reminders' : 'settings');
    const [voiceActive, setVoiceActive] = useState(false);
    const voice = useRef<LiveVoiceClient | null>(null);
    const [name, setName] = useState('Agent');
    const [provider, setProvider] = useState('gemini');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [voiceModel, setVoiceModel] = useState('gemini-3.8-live');
    const [motionEnabled, setMotionEnabled] = useState(true);
    const [apiKey, setApiKey] = useState('');
    const [projectId, setProjectId] = useState('');
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [busy, setBusy] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState('');
    const [readAloud, setReadAloud] = useState(false);
    const request = useRef<AbortController | null>(null);
    const locked = useRef(false);
    const actionLock = useRef(false);
    const alive = useRef(true);
    const end = useRef<HTMLDivElement>(null);
    const launcher = useRef<HTMLButtonElement>(null);
    const heading = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLElement>(null);
    const projects = Object.values(canvases).filter(project => !project.id.startsWith('shared_') && isProjectFetchedFromServer(project.id, userId));

    useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); window.speechSynthesis?.cancel(); }; }, []);
    const previouslyOpen = useRef(open);
    useEffect(() => { if (open) heading.current?.focus(); else if (previouslyOpen.current) launcher.current?.focus(); previouslyOpen.current = open; }, [open]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);
    const speak = (text: string) => {
        if (!('speechSynthesis' in window)) { setError('Read-aloud is not supported in this browser.'); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = navigator.language || 'en-IN';
        utterance.onerror = event => { if (event.error !== 'interrupted' && event.error !== 'canceled') setError('Read-aloud could not start. Try again or use the text reply.'); };
        window.speechSynthesis.speak(utterance);
    };
    const close = () => { voice.current?.stop(); setOpen(false); window.speechSynthesis?.cancel(); launcher.current?.focus(); };
    const reset = () => { voice.current?.stop(); request.current?.abort(); request.current = null; locked.current = false; setBusy(false); setMessages([]); setError(''); window.speechSynthesis?.cancel(); };
    const buildContext = async () => {
        const token = await getToken();
        if (!token) throw new Error('Sign in again to connect your assistant.');
        if (!projectId || !isProjectFetchedFromServer(projectId, userId)) throw new Error('Select an available project first.');
        if (/^proj_\d+$/.test(projectId)) await workspaceService.getProjectCanvas(Number(projectId.slice(5)), token);
        const state = useStore.getState();
        const project = state.canvases[projectId];
        if (!project) throw new Error('This project is no longer available.');
        const schedule = await reminderRequest('', token) as ReminderStatus;
        const reminders = schedule.reminders.filter(item => !item.project_id || item.project_id === projectId);
        const context = `Local time: ${new Date().toString()}\nTimezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\nAccount reminders for this project and personal reminders: ${JSON.stringify(reminders)}\n` + buildProjectCapsule(project, { ...state, timetables: useTimetables.getState().tables }, 'Use this project as reference for the user’s request.');
        if (context.length > 24000) throw new Error('This project exceeds the assistant context limit. Use the AI capsule workspace to export its full context.');
        return context;
    };
    const send = async () => {
        if (locked.current || !draft.trim() || !apiKey.trim()) return;
        const project = useStore.getState().canvases[projectId];
        if (!project || !isProjectFetchedFromServer(projectId, userId)) { setError('Select an available project first. Open cloud projects once to load them.'); return; }
        const controller = new AbortController(); request.current = controller; locked.current = true; setBusy(true); setError('');
        const text = draft.trim();
        const timer = window.setTimeout(() => controller.abort(), 55000);
        try {
            const token = await getToken();
            if (!token) throw new Error('Sign in again to connect your assistant.');
            const context = await buildContext();
            if (controller.signal.aborted) return;
            const response = await fetch(`${API_BASE_URL}/api/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal: controller.signal,
                body: JSON.stringify({ provider, model: model.trim(), apiKey: apiKey.trim(), name: name.trim(), message: text, context, history: messages.slice(-8).map(message => ({ role: message.role, text: message.text.slice(0, 3000) })) }) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'The assistant could not connect. Check that the backend is running.');
            if (controller.signal.aborted) return;
            setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', text }, { id: crypto.randomUUID(), role: 'assistant', text: data.reply, actions: data.actions, projectId }]);
            setDraft('');
            if (readAloud) speak(data.reply);
        } catch (cause) {
            if (request.current === controller) setError(controller.signal.aborted ? 'Request stopped. No actions were applied.' : cause instanceof Error ? cause.message : 'Unable to connect. Try again.');
        } finally {
            window.clearTimeout(timer);
            if (request.current === controller) { request.current = null; locked.current = false; setBusy(false); }
        }
    };
    const apply = async (message: Message, undoing = false) => {
        if (actionLock.current || (!undoing && message.applied) || busy) return;
        actionLock.current = true; setApplying(true); setError('');
        try {
            const id = message.projectId || '';
            if (id !== projectId || !isProjectFetchedFromServer(id, userId)) throw new Error('Project changed. Ask again with the correct project selected.');
            if (/^proj_\d+$/.test(id)) await workspaceService.getProjectCanvas(Number(id.slice(5)), await getToken());
            if (!alive.current) return;
            const state = useStore.getState();
            const project = state.canvases[id];
            if (!project) throw new Error('Project no longer exists.');
            const calendar = state.projectCalendarEvents[id] || {};
            if (undoing) {
                if (!message.undo || message.after !== JSON.stringify([project.todos, calendar])) throw new Error('Project tasks or calendar changed since this action. Review them directly instead of undoing newer work.');
                if (message.undo.serverReminderIds?.length) await reminderRequest('/batch/remove', await getToken(), 'DELETE', { ids: message.undo.serverReminderIds });
                if (!alive.current) return;
                if (message.after !== JSON.stringify([useStore.getState().canvases[id]?.todos, useStore.getState().projectCalendarEvents[id] || {}])) throw new Error('Reminders were cancelled, but your project changed during undo. Review task changes manually.');
                const current = useStore.getState();
                const currentProject = current.canvases[id];
                if (!currentProject) throw new Error('Project no longer exists.');
                const reverted = undoAssistantActions(currentProject, current.projectCalendarEvents[id] || {}, message.undo);
                setMessages(previous => previous.map(item => item.id === message.id ? { ...item, undo: undefined } : item));
                useStore.setState({ canvases: { ...useStore.getState().canvases, [id]: reverted.project }, projectCalendarEvents: { ...useStore.getState().projectCalendarEvents, [id]: reverted.calendar } });
                for (const { date, event } of message.undo.reminders) NotificationManager.cancelNotification(event.task, event.time, date, `${id}:${event.id}`);
                setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: 'Undid the approved task and reminder changes.' }]);
                return;
            }
            const actions = message.actions || [];
            const localActions = actions.filter(action => action.type !== 'add_reminder');
            const planned = localActions.length ? planAssistantActions(project, calendar, localActions, Date.now(), () => crypto.randomUUID()) : { project, calendar, openProject: false, undo: { addedTaskIds: [], completedTaskIds: [], reminders: [] } as AssistantUndo };
            const reminders = actions.flatMap((action, index) => action.type === 'add_reminder' ? [{ id: `${message.id}_${index}`, title: action.text, projectId: id, date: action.date, time: action.time, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, repeat: action.repeat || 'once' }] : []);
            if (reminders.length) {
                await reminderRequest('/batch', await getToken(), 'POST', { items: reminders });
                planned.undo.serverReminderIds = reminders.map(item => item.id);
            }
            if (!alive.current) return;
            // Avoid overwriting edits made elsewhere while the reminder save was in flight.
            if (useStore.getState().canvases[id] !== project || useStore.getState().projectCalendarEvents[id] !== state.projectCalendarEvents[id]) {
                setMessages(previous => previous.map(item => item.id === message.id ? { ...item, applied: true } : item));
                throw new Error('Project changed during approval. Saved reminders appear under Reminders; local task changes were not applied. Ask again for task edits.');
            }
            // Disable reapplication before committing, including when browser persistence fails after mutation.
            setMessages(previous => previous.map(item => item.id === message.id ? { ...item, applied: true, undo: planned.undo, after: JSON.stringify([planned.project.todos, planned.calendar]) } : item));
            useStore.setState({ canvases: { ...useStore.getState().canvases, [id]: planned.project }, projectCalendarEvents: { ...useStore.getState().projectCalendarEvents, [id]: planned.calendar } });
            for (const { date, event } of planned.undo.reminders) NotificationManager.scheduleNotification(event.task, event.time, date, `${id}:${event.id}`);
            if (planned.openProject) navigate(`/strategy/${encodeURIComponent(id)}`);
            const confirmation = reminders.length
                ? 'Saved the approved reminders to your account. Enable this device in Reminders for background notifications. Approved task changes use the normal project save queue.'
                : planned.undo.addedTaskIds.length || planned.undo.completedTaskIds.length
                    ? 'Saved the approved task changes locally. Cloud projects use the normal save queue; watch its status for sync errors.'
                    : 'Opened your project.';
            setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: confirmation }]);
            voice.current?.updateContext(confirmation + '\nCurrent project tasks: ' + JSON.stringify(planned.project.todos));
            if (readAloud && !voiceActive) speak(confirmation);
        } catch (cause) { setError(cause instanceof Error ? `Could not finish: ${cause.message} Check your project before trying again.` : 'Could not apply these changes.'); }
        finally { actionLock.current = false; setApplying(false); }
    };

    return <>
        <AssistantLiveVoice key={provider} provider={provider} apiKey={apiKey} name={name.trim() || 'Agent'} model={voiceModel} motionEnabled={motionEnabled}
            hidden={open} ready={!!projectId && !!apiKey.trim() && !!voiceModel.trim()} disabled={busy || applying}
            launcherRef={launcher} context={buildContext} controllerRef={voice} onActive={setVoiceActive}
            onOpen={section => { voice.current?.stop(); setTab(section); setOpen(true); }}
            onTranscript={(role, text) => { if (text.trim()) setMessages(previous => [...previous, { id: crypto.randomUUID(), role, text }]); }}
            onProposal={proposal => {
                setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: proposal.reply, actions: proposal.actions, projectId }]);
                if (proposal.actions.length) { voice.current?.stop(); setTab('chat'); setOpen(true); }
            }} />
        {open && <div className="assistant-backdrop" onClick={close} aria-hidden="true" />}
        {open && <section ref={panel} id="personal-assistant" className="assistant-panel" role="dialog" aria-label="Personal assistant" aria-modal="true" onKeyDown={event => {
            if (event.key === 'Escape') { close(); return; }
            if (event.key === 'Tab') {
                const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary') || []).filter(item => item.offsetParent !== null);
                const first = items[0], last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        }}>
            <header><div><span className="assistant-eyebrow">{name.trim() || 'Agent'}</span><h2>{tab === 'settings' ? 'Agent settings' : tab === 'chat' ? 'Conversation' : 'Reminders'}</h2></div><button ref={heading} aria-label="Back to agent" onClick={close}><X size={20} /></button></header>
            <nav className="assistant-tabs" aria-label="Agent sections">{(['settings', 'chat', 'reminders'] as const).map(item => <button key={item} aria-pressed={tab === item} disabled={busy || applying} onClick={() => setTab(item)}>{item === 'chat' ? 'Conversation' : item === 'settings' ? 'Settings' : 'Reminders'}</button>)}</nav>
            <div className="assistant-scroll">
                {tab === 'settings' && <div className="assistant-settings"><p>Make this agent yours. Connect Gemini or OpenAI to begin.</p>
                    <label>Agent name<input value={name} maxLength={40} disabled={busy || voiceActive} onChange={event => setName(event.target.value)} /></label>
                    <div className="assistant-settings-row"><label>Provider<select value={provider} disabled={busy || voiceActive} onChange={event => { reset(); setProvider(event.target.value); setModel(event.target.value === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4.1-mini'); setVoiceModel(event.target.value === 'gemini' ? 'gemini-3.8-live' : 'gpt-realtime'); setApiKey(''); }}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label><label>Text model<input value={model} disabled={busy || voiceActive} maxLength={100} onChange={event => setModel(event.target.value)} /></label></div>
                    <label>API key<input type="password" autoComplete="off" spellCheck={false} value={apiKey} disabled={busy || voiceActive} placeholder={provider === 'gemini' ? 'Google AI Studio API key' : 'OpenAI API key'} onChange={event => setApiKey(event.target.value)} /></label>
                    <label>Voice model<input value={voiceModel} disabled={busy || voiceActive} maxLength={100} onChange={event => setVoiceModel(event.target.value)} /></label>
                    <label className="agent-motion-setting"><input type="checkbox" checked={motionEnabled} onChange={event => setMotionEnabled(event.target.checked)} /> Animate particle sphere</label>
                    <details className="agent-privacy"><summary>Privacy & voice usage</summary><p>Your key stays in this page’s memory and clears on refresh or disconnect. It passes through Stratabin’s backend. Audio streams to your provider, whose API charges apply. Replies use an AI voice. Sessions end after nine minutes; tap the circle again to stop.</p></details>
                    <button disabled={applying} onClick={() => { reset(); setApiKey(''); }}>Disconnect & clear conversation</button>
                </div>}
                <div hidden={tab !== 'settings'}><label className="assistant-project">Project context<select value={projectId} disabled={busy || applying || voiceActive} onChange={event => { reset(); setProjectId(event.target.value); }}><option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name || 'Untitled project'}</option>)}</select></label>
                <p className="assistant-note">Your agent uses this project and your reminders. Attachments are excluded. Open a cloud project once to load it here.</p><button className="assistant-primary agent-done" onClick={close}>Done · back to agent</button></div>
                {tab === 'reminders' && <AssistantReminders projectId={projectId} />}
                {tab === 'chat' && !messages.length && <div className="assistant-welcome"><Bot size={28} /><h3>A clearer view of your day.</h3><p>Ask about this project, plan a next step, or prepare a task. Review proposed changes before applying them.</p><div>{['Summarise this project’s important points.', 'What is scheduled today, and what is still unfinished?', 'Help me plan my next three tasks.'].map(prompt => <button key={prompt} disabled={busy || voiceActive} onClick={() => setDraft(prompt)}>{prompt}<ArrowUpRight size={15} /></button>)}</div></div>}
                <div hidden={tab !== 'chat'} className="assistant-messages" role="log" aria-live="polite">{messages.map(message => <article key={message.id} className={`assistant-message ${message.role}`}><strong>{message.role === 'user' ? 'You' : name || 'Assistant'}</strong><p>{message.text}</p>{message.role === 'assistant' && <button aria-label="Read reply aloud" disabled={voiceActive} onClick={() => speak(message.text)}><Volume2 size={15} />Read aloud</button>}
                    {!!message.actions?.length && <div className="assistant-actions"><strong>{message.applied ? 'Reviewed' : 'Review proposed actions'}</strong>{message.actions.map((action, index) => <p key={index}>{action.type.replaceAll('_', ' ')}: {action.type === 'complete_task' ? canvases[message.projectId || '']?.todos?.find(task => task.id === action.taskId)?.text || 'Task no longer available' : action.text || canvases[message.projectId || '']?.name} {action.date} {action.time} {action.type === 'add_reminder' ? `· ${action.repeat || 'once'} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : ''}</p>)}<button disabled={message.applied || busy || applying} onClick={() => void apply(message)}><Check size={16} />{message.applied ? 'Applied once' : 'Apply these actions'}</button>{message.applied && message.undo && <button disabled={applying || busy} onClick={() => void apply(message, true)}>Undo changes</button>}{!message.applied && <button disabled={applying} onClick={() => setMessages(previous => previous.map(item => item.id === message.id ? { ...item, actions: [] } : item))}>Dismiss</button>}</div>}
                </article>)}</div>
                {busy && <p role="status">Thinking with {provider === 'gemini' ? 'Gemini' : 'OpenAI'}…</p>}
                {error && <p role="alert" className="assistant-error">{error}</p>}<div ref={end} />
            </div>
            {tab === 'chat' && <footer><label className="assistant-compose">Your request<textarea rows={3} maxLength={3000} disabled={busy || applying} value={draft} placeholder="Ask about your project…" onChange={event => setDraft(event.target.value)} /></label>
                <div className="assistant-compose-tools">{!busy && !applying && <VoiceTyping destination="your request" onInsert={text => setDraft(previous => `${previous} ${text}`.trim().slice(0, 3000))} />}<button onClick={() => window.speechSynthesis?.cancel()} aria-label="Stop speaking"><Square size={16} /></button><label><input type="checkbox" checked={readAloud} onChange={event => setReadAloud(event.target.checked)} />Speak replies</label>{busy ? <button onClick={() => request.current?.abort()}>Stop request</button> : <button className="assistant-send" disabled={!draft.trim() || !apiKey.trim() || !projectId || applying} onClick={() => void send()}><Send size={17} />Ask</button>}</div>
                <button className="assistant-reminders" onClick={() => void NotificationManager.enableReminders().then(mode => { useStore.getState().checkNotifications(); setError(`Reminders enabled (${mode}). Keep Stratabin open to receive them.`); })}>Enable in-app reminders</button>
            </footer>}
        </section>}
    </>;
}
