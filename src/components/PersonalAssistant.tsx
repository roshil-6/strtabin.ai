import AssistantProjectPicker from './AssistantProjectPicker';
import MarkdownRenderer from './MarkdownRenderer';
import useModalStore from '../store/useModalStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, X, Send, Volume2, VolumeX, Square, Check, ArrowUpRight, Sparkles, Maximize2, RotateCcw, Activity, BarChart2 } from 'lucide-react';
import useStore from '../store/useStore';
import { buildAssistantContext } from '../lib/assistantContext';
import { isListedProject, isTeamProject } from '../lib/projectVisibility';
import { API_BASE_URL } from '../constants';
import { useProjectLoader, isProjectFetchedFromServer, hydrateNewProject } from '../hooks/useProjectLoader';
import { workspaceService, type Project } from '../services/workspaceService';
import { NotificationManager } from '../services/NotificationManager';
import VoiceTyping from './VoiceTyping';
import AssistantLiveVoice from './AssistantLiveVoice';
import AssistantReminders from './AssistantReminders';
import { reminderRequest, type ReminderStatus } from '../services/assistantReminders';
import type { LiveVoiceClient } from '../lib/liveVoiceClient';
import type { AssistantScreen, VoiceDecision } from '../lib/voiceProtocol';
import './PersonalAssistant.css';
import { projectBoardPatch } from '../lib/boardOperations';
import { planAssistantActions, undoAssistantActions, type AssistantAction, type AssistantUndo } from '../lib/assistantActions';

type Message = { id: string; role: 'user' | 'assistant'; text: string; actions?: AssistantAction[]; undo?: AssistantUndo; after?: string; projectId?: string; applied?: boolean };
type ApplyResult = { status: 'applied' | 'failed' | 'cancelled'; summary?: string; reason?: string; executed: boolean };
const PROJECT_SCREENS = new Set(['overview', 'writing', 'flow', 'tasks', 'timeline']);
/** Route for a screen Sasha may open; project screens need a project id. */
function screenPath(screen: string, projectId: string) {
    const id = encodeURIComponent(projectId);
    if (PROJECT_SCREENS.has(screen) && !projectId) return null;
    switch (screen) {
        case 'dashboard': return '/dashboard';
        case 'monitor': return '/dashboard?tab=monitor';
        case 'reports': return projectId ? `/ai/${id}?tab=reports` : '/reports';
        case 'calendar': return projectId ? `/calendar/${id}` : '/calendar';
        case 'timetable': return '/timetable';
        case 'community': return '/community';
        case 'ai': return projectId ? `/ai/${id}` : '/ai';
        case 'billing': return '/billing';
        case 'overview': return `/project/${id}`;
        case 'writing': return `/strategy/${id}`;
        case 'flow': return `/strategy/${id}?view=flow`;
        case 'tasks': return `/todo/${id}`;
        case 'timeline': return `/timeline/${id}`;
        default: return null;
    }
}
const describePlan = (actions: AssistantAction[]) => actions.map(action => action.type === 'create_project' ? `create project “${action.text}”` : action.type === 'create_flow' ? `add a flow map “${action.text.split('\n')[0]}”` : action.type === 'add_task' ? `add task “${action.text}”` : action.type === 'add_reminder' ? `remind “${action.text}” on ${action.date} ${action.time}` : action.type === 'complete_task' ? 'complete a task' : action.type === 'open_screen' ? `open ${action.text}` : 'open the project');

export default function PersonalAssistant() {
    const { userId, isSignedIn } = useAuth();
    const location = useLocation();
    if (!isSignedIn || /^\/(auth|sso-callback)(\/|$)/.test(location.pathname) || location.pathname === '/') return null;
    return <AssistantSession key={userId} fullPage={location.pathname === '/sasha'} />;
}

function AssistantSession({ fullPage }: {fullPage:boolean}) {
    const { getToken, userId } = useAuth();
    const navigate = useNavigate();
    const canvases = useStore(state => state.canvases);
    const location = useLocation();
    const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('assistant') === 'reminders');
    const [tab, setTab] = useState<'chat' | 'settings' | 'reminders'>(() => new URLSearchParams(location.search).get('assistant') === 'reminders' ? 'reminders' : 'chat');
    const [wakeActive, setWakeActive] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const voice = useRef<LiveVoiceClient | null>(null);
    const [name, setName] = useState(() => {try {return localStorage.getItem(`sasha-name:${userId}`)?.slice(0,40) || 'Sasha';} catch {return 'Sasha';}});
    const provider = 'gemini';
    const model = 'gemini-3.5-flash-lite';
    const voiceModel = 'gemini-3.8-live';
    const [motionEnabled, setMotionEnabled] = useState(true);
    const [access, setAccess] = useState<{pro:boolean;trial?:boolean;configured:boolean;remaining?:{chat:number;voice:number};limits?:{chat:number;voice:number}} | null>(null);
    const [accessError, setAccessError] = useState('');
    const [accessAttempt, setAccessAttempt] = useState(0);
    const [cloudProjects,setCloudProjects] = useState<Project[]>([]);
    const [projectId, setProjectId] = useState('');
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef(messages);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    const [pendingVoiceId, setPendingVoiceId] = useState('');
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
    const composerRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {try {localStorage.setItem(`sasha-name:${userId}`,name);} catch {/* Name remains usable for this session. */}},[name,userId]);
    // Every personal project Sasha can work on: ones made on the dashboard (stored here) and cloud projects.
    const projects = useMemo(() => {
        const local = Object.values(canvases).filter(project => isListedProject(project) && !isTeamProject(project))
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            .map(project => ({ id: project.id, name: (project.title || project.name || '').trim() || 'Untitled project' }));
        const seen = new Set(local.map(project => project.id));
        return [...local, ...cloudProjects.filter(project => !seen.has(`proj_${project.id}`)).map(project => ({ id: `proj_${project.id}`, name: project.title }))];
    }, [canvases, cloudProjects]);
    const knownProject = (id: string) => projects.some(project => project.id === id);
    // Opening Sasha from inside a project works on that project.
    const routeProject = location.pathname.match(/^\/(?:strategy|todo|timeline|calendar|ai|project|overview)\/([^/?#]+)/)?.[1];
    useEffect(() => {
        const id = routeProject ? decodeURIComponent(routeProject) : '';
        if (!id || projectId || messagesRef.current.length || !knownProject(id)) return;
        setProjectId(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeProject, projects]);
    const loader = useProjectLoader(projectId || undefined);
    // Free accounts can use Sasha while their trial credits last; Pro has a daily allowance.
    const trialLeft = access && !access.pro ? (access.remaining?.chat ?? 0) + (access.remaining?.voice ?? 0) : 0;
    const canUse = Boolean(access && (access.pro || trialLeft > 0));
    const ready = Boolean(canUse && access?.configured && !loader.loading && !loader.error);
    const limits = access?.limits ?? { chat: 10, voice: 10 };
    const visible = fullPage || open;
    useEffect(() => {
        let cancelled = false;
        getToken().then(async token => {
            if (!token) throw new Error('Sign in again to use Sasha.');
            const response = await fetch(`${API_BASE_URL}/api/assistant/status`, {headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
            if (!response.ok) throw new Error('Could not check Sasha access.');
            const status = await response.json();
            const projectResponse = await fetch(`${API_BASE_URL}/api/assistant/projects`, {headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
            if (!projectResponse.ok) throw new Error('Could not load projects.');
            const data = await projectResponse.json();
            if (!cancelled) {setAccess(status);setCloudProjects(data.projects || []);setAccessError('');}
        }).catch(() => {if (!cancelled) setAccessError('Sasha could not connect. Check your connection and retry.');});
        return () => {cancelled = true;};
    },[getToken,accessAttempt]);

    useEffect(() => {
        if ((open || fullPage) && access && !access.pro) {
            setAccessAttempt(v => v + 1);
        }
    }, [open, fullPage]);

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
    const close = () => { voice.current?.stop(); if (fullPage) navigate('/dashboard'); setOpen(false); window.speechSynthesis?.cancel(); launcher.current?.focus(); };
    const reset = () => { voice.current?.stop(); request.current?.abort(); request.current = null; locked.current = false; setBusy(false); setMessages([]); setError(''); window.speechSynthesis?.cancel(); };
    const buildContext = async () => {
        const token = await getToken();
        if (!token) throw new Error('Sign in again to connect your assistant.');
        if (!projectId) return `Local time: ${new Date().toString()}\nNo project selected. Brainstorm freely, or propose creating a project. Do not claim to know existing project contents.`;
        if (!knownProject(projectId) || !isProjectFetchedFromServer(projectId, userId)) throw new Error('Select an available project first.');
        // Confirm access to the project and load reminders together; doing them in turn slowed every connect.
        const [, schedule] = await Promise.all([
            /^proj_\d+$/.test(projectId) ? workspaceService.getProjectCanvas(Number(projectId.slice(5)), token) : null,
            reminderRequest('', token) as Promise<ReminderStatus>,
        ]);
        const state = useStore.getState();
        const project = state.canvases[projectId];
        if (!project) throw new Error('This project is no longer available.');
        const reminders = schedule.reminders.filter(item => !item.project_id || item.project_id === projectId);
        // A compact snapshot with the writing first; large projects are trimmed, never rejected.
        return buildAssistantContext(project, state, { now: new Date(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, reminders });
    };
    const send = async () => {
        if (locked.current || !draft.trim() || !ready) return;
        const project = useStore.getState().canvases[projectId];
        if (projectId && (!project || !isProjectFetchedFromServer(projectId, userId))) { setError(loader.loading ? 'Loading this project. Try again in a moment.' : 'Select an available project first.'); return; }
        const controller = new AbortController(); request.current = controller; locked.current = true; setBusy(true); setError('');
        const text = draft.trim();
        const timer = window.setTimeout(() => controller.abort(), 55000);
        try {
            const token = await getToken();
            if (!token) throw new Error('Sign in again to connect your assistant.');
            const context = await buildContext();
            if (controller.signal.aborted) return;
            const response = await fetch(`${API_BASE_URL}/api/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal: controller.signal,
                body: JSON.stringify({ provider, model: model.trim(), name: name.trim(), message: text, context, history: messages.slice(-8).map(message => ({ role: message.role, text: message.text.slice(0, 3000) })) }) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'The assistant could not connect. Check that the backend is running.');
            if (controller.signal.aborted) return;
            const navigationOnly = Array.isArray(data.actions) && data.actions.length > 0 && data.actions.every((action: AssistantAction) => action.type === 'open_screen');
            setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', text }, { id: crypto.randomUUID(), role: 'assistant', text: data.reply, actions: navigationOnly ? [] : data.actions, projectId }]);
            if (navigationOnly) openScreen(data.actions[data.actions.length - 1].text, projectId);
            if (typeof data.remaining === 'number') setAccess(previous => previous && { ...previous, remaining: { chat: data.remaining, voice: previous.remaining?.voice ?? limits.voice } });
            setDraft('');
            if (readAloud && !voiceActive && !wakeActive) speak(data.reply);
        } catch (cause) {
            if (request.current === controller) setError(controller.signal.aborted ? 'Request stopped. No actions were applied.' : cause instanceof Error ? cause.message : 'Unable to connect. Try again.');
        } finally {
            window.clearTimeout(timer);
            if (request.current === controller) { request.current = null; locked.current = false; setBusy(false); }
        }
    };
    const openScreen = (screen: string, target: string) => {
        const path = screenPath(screen, target);
        if (!path) return false;
        navigate(path);
        return true;
    };
    const apply = async (message: Message, undoing = false): Promise<ApplyResult> => {
        if (!ready || actionLock.current || (!undoing && message.applied) || busy) return { status: 'failed', executed: false, reason: message.applied ? 'This plan was already applied.' : 'Sasha is busy. Try again in a moment.' };
        actionLock.current = true; setApplying(true); setError('');
        try {
            let id = message.projectId || '';
            let created = '';
            let actions = message.actions || [];
            const creation = actions.find(action => action.type === 'create_project');
            if (creation && !undoing) {
                if (actions[0] !== creation || actions.filter(action => action.type === 'create_project').length !== 1 || !creation.text.trim() || creation.text.length > 200) throw new Error('Create one named project first, then its contents.');
                const token = await getToken(); if (!token) throw new Error('Sign in again.');
                // Disable retries before a network write: a lost response must not create a duplicate project.
                setMessages(previous => previous.map(item => item.id === message.id ? {...item,applied:true} : item));
                const teams = await workspaceService.getWorkspaces(token);
                let workspace = teams.workspaces.find((item: {type:string;role?:string}) => item.type === 'individual' && item.role === 'admin');
                if (!workspace) {const result = await workspaceService.createWorkspace({name:'My projects',type:'individual',visibility:'private'},token); workspace = result.workspace;}
                const result = await workspaceService.createProject(workspace.id,{title:creation.text.trim(),type:'strategy'},token);
                id = `proj_${result.project.id}`; created = result.project.title;
                setCloudProjects(previous => [...previous,result.project]);
                setProjectId(id);
                setMessages(previous => previous.map(item => item.id === message.id ? {...item,projectId:id} : item));
                actions = actions.slice(1);
                if (!actions.length) {
                    const summary = `Created “${created}” in your private workspace. It is now selected.`;
                    setMessages(previous => [...previous,{id:crypto.randomUUID(),role:'assistant',text:`${summary} Ask me to add a flow map or tasks.`}]);
                    voice.current?.updateContext(summary);
                    return { status: 'applied', executed: true, summary };
                }
                // The rest of the plan targets the new project; load it before planning.
                await hydrateNewProject(id, userId, await getToken());
            }
            if (!id || (!created && id !== projectId) || !isProjectFetchedFromServer(id, userId)) throw new Error('Project changed. Ask again with the correct project selected.');
            if (!created && /^proj_\d+$/.test(id)) await workspaceService.getProjectCanvas(Number(id.slice(5)), await getToken());
            if (!alive.current) return { status: 'failed', executed: Boolean(created), reason: 'Sasha closed before finishing.' };
            const state = useStore.getState();
            const project = state.canvases[id];
            if (!project) throw new Error('Project no longer exists.');
            const calendar = state.projectCalendarEvents[id] || {};
            if (undoing) {
                if (!message.undo || message.after !== JSON.stringify([project.todos, calendar, project.nodes, project.edges])) throw new Error('Project tasks or calendar changed since this action. Review them directly instead of undoing newer work.');
                if (message.undo.serverReminderIds?.length) await reminderRequest('/batch/remove', await getToken(), 'DELETE', { ids: message.undo.serverReminderIds });
                if (!alive.current) return { status: 'failed', executed: true, reason: 'Sasha closed before finishing.' };
                if (message.after !== JSON.stringify([useStore.getState().canvases[id]?.todos, useStore.getState().projectCalendarEvents[id] || {}, useStore.getState().canvases[id]?.nodes, useStore.getState().canvases[id]?.edges])) throw new Error('Reminders were cancelled, but your project changed during undo. Review task changes manually.');
                const current = useStore.getState();
                const currentProject = current.canvases[id];
                if (!currentProject) throw new Error('Project no longer exists.');
                const reverted = undoAssistantActions(currentProject, current.projectCalendarEvents[id] || {}, message.undo);
                setMessages(previous => previous.map(item => item.id === message.id ? { ...item, undo: undefined } : item));
                useStore.setState({ ...projectBoardPatch(useStore.getState(), id, reverted.project), canvases: { ...useStore.getState().canvases, [id]: reverted.project }, projectCalendarEvents: { ...useStore.getState().projectCalendarEvents, [id]: reverted.calendar } });
                for (const { date, event } of message.undo.reminders) NotificationManager.cancelNotification(event.task, event.time, date, `${id}:${event.id}`);
                setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: 'Undid the approved task and reminder changes.' }]);
                return { status: 'applied', executed: true, summary: 'Undid the approved changes.' };
            }
            const screens = actions.filter(action => action.type === 'open_screen');
            const localActions = actions.filter(action => action.type !== 'add_reminder' && action.type !== 'open_screen');
            const planned = localActions.length ? planAssistantActions(project, calendar, localActions, Date.now(), () => crypto.randomUUID()) : { project, calendar, openProject: false, undo: { addedTaskIds: [], completedTaskIds: [], reminders: [] } as AssistantUndo };
            const reminders = actions.flatMap((action, index) => action.type === 'add_reminder' ? [{ id: `${message.id}_${index}`, title: action.text, projectId: id, date: action.date, time: action.time, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, repeat: action.repeat || 'once' }] : []);
            if (reminders.length) {
                await reminderRequest('/batch', await getToken(), 'POST', { items: reminders });
                planned.undo.serverReminderIds = reminders.map(item => item.id);
            }
            if (!alive.current) return { status: 'failed', executed: reminders.length > 0, reason: 'Sasha closed before finishing.' };
            // Avoid overwriting edits made elsewhere while the reminder save was in flight.
            if (useStore.getState().canvases[id] !== project || useStore.getState().projectCalendarEvents[id] !== state.projectCalendarEvents[id]) {
                setMessages(previous => previous.map(item => item.id === message.id ? { ...item, applied: true } : item));
                throw new Error('Project changed during approval. Saved reminders appear under Reminders; local task changes were not applied. Ask again for task edits.');
            }
            // Disable reapplication before committing, including when browser persistence fails after mutation.
            setMessages(previous => previous.map(item => item.id === message.id ? { ...item, applied: true, undo: planned.undo, after: JSON.stringify([planned.project.todos, planned.calendar, planned.project.nodes, planned.project.edges]) } : item));
            useStore.setState({ ...projectBoardPatch(useStore.getState(), id, planned.project), canvases: { ...useStore.getState().canvases, [id]: planned.project }, projectCalendarEvents: { ...useStore.getState().projectCalendarEvents, [id]: planned.calendar } });
            for (const { date, event } of planned.undo.reminders) NotificationManager.scheduleNotification(event.task, event.time, date, `${id}:${event.id}`);
            const screen = screens[screens.length - 1];
            if (screen) openScreen(screen.text, id);
            // A new project with a flow map lands on the flow, so the result is visible right away.
            else if (created && actions.some(action => action.type === 'create_flow')) openScreen('flow', id);
            else if (planned.openProject || created) navigate(`/strategy/${encodeURIComponent(id)}`);
            const done = describePlan(actions.filter(action => action.type !== 'open_screen'));
            const confirmation = (created ? `Created “${created}” and applied ${done.length} step${done.length === 1 ? '' : 's'}. ` : '') + (reminders.length
                ? 'Saved the approved reminders to your account. Enable this device in Reminders for background notifications. Approved task changes use the normal project save queue.'
                : planned.undo.addedTaskIds.length || planned.undo.completedTaskIds.length || planned.undo.addedNodeIds?.length
                    ? 'Saved the approved project changes locally. Cloud projects use the normal save queue; watch its status for sync errors.'
                    : 'Opened your project.');
            setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: confirmation }]);
            voice.current?.updateContext(confirmation + '\nCurrent project tasks: ' + JSON.stringify(planned.project.todos));
            if (readAloud && !voiceActive && !wakeActive) speak(confirmation);
            return { status: 'applied', executed: true, summary: `${confirmation} Done: ${done.join('; ') || 'navigation'}.` };
        } catch (cause) {
            const reason = cause instanceof Error ? cause.message : 'Could not apply these changes.';
            setError(cause instanceof Error ? `Could not finish: ${reason} Check your project before trying again.` : reason);
            return { status: 'failed', executed: false, reason };
        }
        finally { actionLock.current = false; setApplying(false); }
    };
    const cancelPlan = (messageId: string) => {
        setMessages(previous => previous.map(item => item.id === messageId ? { ...item, actions: [] } : item));
        setPendingVoiceId(current => current === messageId ? '' : current);
    };
    const pendingVoice = messages.find(item => item.id === pendingVoiceId && item.actions?.length && !item.applied);
    const decideVoicePlan = async (decision: VoiceDecision): Promise<ApplyResult> => {
        const message = messagesRef.current.find(item => item.id === pendingVoiceId && item.actions?.length && !item.applied);
        if (!message) return { status: 'failed', executed: false, reason: 'There is no pending plan. Propose one first.' };
        if (decision === 'cancel') { cancelPlan(message.id); return { status: 'cancelled', executed: false, summary: 'Cancelled. Nothing was changed.' }; }
        const result = await apply(message);
        if (result.status === 'applied') setPendingVoiceId('');
        return result;
    };

    const agentLabel = name.trim() || 'Sasha';

    return <>
        <AssistantLiveVoice key={provider} provider={provider} name={name.trim() || 'Agent'} model={voiceModel} motionEnabled={motionEnabled}
            hidden={open && !fullPage} ready={ready} disabled={busy || applying} projectId={projectId}
            launcherRef={launcher} context={buildContext} controllerRef={voice} onActive={setVoiceActive} onWakeActive={setWakeActive}
            voiceRemaining={access?.remaining?.voice} voiceLimit={limits.voice} trial={Boolean(access && !access.pro)}
            onVoiceRemaining={left => setAccess(previous => previous && { ...previous, remaining: { chat: previous.remaining?.chat ?? limits.chat, voice: left } })}
            pending={pendingVoice ? { lines: describePlan(pendingVoice.actions || []), busy: applying } : null}
            onApplyPending={() => { if (pendingVoice) void apply(pendingVoice).then(result => { if (result.status === 'applied') { setPendingVoiceId(''); voice.current?.updateContext(`The user tapped Apply. ${result.summary}`); } }); }}
            onCancelPending={() => { if (pendingVoice) { cancelPlan(pendingVoice.id); voice.current?.updateContext('The user tapped Cancel on the pending plan. Nothing was changed.'); } }}
            onDecision={decideVoicePlan}
            onScreen={(screen: AssistantScreen) => openScreen(screen, projectId) ? { status: 'opened', screen } : { status: 'rejected', reason: 'That screen needs a selected project. Ask the user which project.' }}
            onOpen={section => { voice.current?.stop(); setTab(section); setOpen(true); }}
            onTranscript={(role, text) => { if (text.trim()) setMessages(previous => [...previous, { id: crypto.randomUUID(), role, text }]); }}
            onProposal={proposal => {
                // Keep the call running: the plan is shown in the voice panel and can be approved by voice or tap.
                const id = crypto.randomUUID();
                const navigationOnly = proposal.actions.every(action => action.type === 'open_screen');
                setMessages(previous => [...previous, { id, role: 'assistant', text: proposal.reply, actions: navigationOnly ? [] : proposal.actions, projectId }]);
                if (navigationOnly) openScreen(proposal.actions[proposal.actions.length - 1].text, projectId);
                else setPendingVoiceId(id);
            }} />
        {open && !fullPage && <div className="assistant-backdrop" onClick={close} aria-hidden="true" />}
        {visible && <section ref={panel} id="personal-assistant" className={`assistant-panel ${fullPage ? 'sasha-workspace' : ''} assistant-settings-view assistant-view-${tab}`} role={fullPage ? 'region' : 'dialog'} aria-label="Sasha AI workspace" aria-modal={fullPage ? undefined : true} onKeyDown={event => {
            if (event.key === 'Escape') { close(); return; }
            if (!fullPage && event.key === 'Tab') {
                const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary') || []).filter(item => item.offsetParent !== null);
                const first = items[0], last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        }}>
            <div className="assistant-scroll">
                <div className="assistant-topbar">
                    <div className="assistant-brand">
                        <span className="assistant-brand-icon" aria-hidden="true"><Sparkles size={15} /></span>
                        <strong>{agentLabel}</strong>
                        <span className="assistant-pro-pill">{access && !access.pro ? 'TRIAL' : 'PRO'}</span>
                    </div>
                    <nav className="assistant-tabs" aria-label="Agent sections">
                        {(['chat', 'reminders', 'settings'] as const).map(item => (
                            <button key={item} type="button" aria-pressed={tab === item} disabled={busy || applying} onClick={() => setTab(item)}>
                                {item === 'chat' ? 'Chat' : item === 'settings' ? 'Settings' : 'Reminders'}
                            </button>
                        ))}
                    </nav>
                    <div className="assistant-topbar-actions">
                        {!fullPage && (
                            <button type="button" className="assistant-icon-btn" title="Open full workspace" aria-label="Open Sasha workspace" onClick={() => { setOpen(false); navigate('/sasha'); }}>
                                <Maximize2 size={16} />
                            </button>
                        )}
                        <button ref={heading} type="button" className="assistant-icon-btn" aria-label="Back to agent" onClick={close}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {!access && !accessError && <p role="status" className="assistant-status-banner">Checking your Sasha access…</p>}
                {accessError && <div role="alert" className="assistant-error">{accessError}<button type="button" onClick={() => setAccessAttempt(value => value+1)}>Retry</button></div>}
                {tab !== 'reminders' && access && !access.pro && trialLeft > 0 && (
                    <div className="sasha-trial" role="status">
                        <Sparkles size={16} aria-hidden="true"/>
                        <p><strong>Free trial</strong> · {access.remaining?.chat ?? 0} of {limits.chat} chats and {access.remaining?.voice ?? 0} of {limits.voice} voice sessions left. Reports use chat credits.</p>
                        <button type="button" onClick={() => navigate('/billing')}>Get Pro</button>
                    </div>
                )}
                {tab !== 'reminders' && access && !access.pro && trialLeft === 0 && (
                    <div className="sasha-upgrade sasha-upgrade-compact">
                        <Bot size={22}/>
                        <div>
                            <h3>You have used your free {agentLabel} trial</h3>
                            <p>Pro gives you {agentLabel} every day: brief your projects, brainstorm ideas, and generate tasks and flow maps with zero setup.</p>
                        </div>
                        <div className="sasha-upgrade-actions">
                            <button type="button" className="assistant-primary-btn" onClick={() => navigate('/billing')}>View Pro plan</button>
                            <button type="button" onClick={() => navigate('/ai')}>Use AI capsules</button>
                        </div>
                    </div>
                )}
                {tab !== 'reminders' && canUse && access && !access.configured && <p role="alert" className="assistant-error">Sasha is waiting for the backend connection to be configured.</p>}

                {tab === 'settings' && <div className="sasha-settings-grid">
                    <section className="sasha-setting-section"><h3>Your assistant</h3><p>Make Sasha your own. Your name preference saves automatically.</p>
                        <label htmlFor="sasha-agent-name">Assistant name</label><input id="sasha-agent-name" value={name} maxLength={40} disabled={busy || voiceActive} onChange={event => setName(event.target.value)} />
                        <small>Use this name when speaking to your assistant.</small>
                        <label className="sasha-setting-toggle"><span><strong>Particle animation</strong><small>Animate the voice circle while you talk.</small></span><input type="checkbox" role="switch" checked={motionEnabled} onChange={event => setMotionEnabled(event.target.checked)} /></label>
                    </section>
                    <section className="sasha-setting-section"><h3>Voice & privacy</h3><p>10 voice credits per day. Starting a session uses 1 credit for up to 3 minutes of back-and-forth conversation. Refills at midnight UTC (5:30 AM India).</p><p>Start a conversation from the Sasha button. Enable “Hey Sasha” there when you want hands-free activation.</p>
                        <ul><li>Microphone access is always your choice.</li><li>Wake listening works in the active tab and may use your browser’s online speech service.</li><li>Live conversations send audio to Google. You can interrupt or stop at any time.</li></ul>
                        <details><summary>What project information is shared?</summary><p>Your selected project context is sent to Google when you ask Sasha. Attachments are excluded. Changes to your project require your review.</p></details>
                    </section>
                    <section className="sasha-setting-section"><h3>Your daily allowance</h3><div className="sasha-usage-grid"><div><strong>10</strong><span>Chat messages</span></div><div><strong>10</strong><span>Voice sessions</span></div></div><p>Up to 3 minutes per voice session. Both allowances refill daily at midnight UTC (5:30 AM in India).</p><small>Credits are reserved when a request or session starts; failed provider attempts may still count. Unused credits do not carry over.</small></section>
                    <section className="sasha-setting-section"><h3>Conversation</h3><p>Clear the messages in this session. Your projects and saved work stay in place.</p><button type="button" disabled={applying || busy} onClick={async()=>{if(await useModalStore.getState().confirm('Clear this conversation? Your projects will stay saved.'))reset();}}>Clear conversation</button><button type="button" onClick={()=>setTab('chat')}>Back to conversation<ArrowUpRight size={15}/></button></section>
                </div>}

                {tab === 'reminders' && <AssistantReminders projectId={projectId} />}

                {tab === 'chat' && (
                    <div className={`assistant-chat-shell ${messages.length ? 'has-messages' : 'is-empty'}`}>
                        {!messages.length && (
                            <div className="assistant-welcome">
                                <div className="assistant-welcome-orb" aria-hidden="true">
                                    <Sparkles size={24} />
                                </div>
                                <h2>How can {agentLabel} help today?</h2>
                                <p>Start with an idea, create a project, or ask for a briefing. You can review proposed tasks and flow maps before applying them.</p>
                                <div className="assistant-starter-grid">
                                    {[
                                        'Create a project called My next idea.',
                                        'Brief me on this project and suggest the next steps.',
                                        'Brainstorm a flow map for this project.',
                                        "Check my project monitor and today's execution progress.",
                                        'Review my saved project reports and key recommendations.',
                                    ].map(prompt => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            disabled={busy || voiceActive}
                                            onClick={() => {
                                                setDraft(prompt);
                                                requestAnimationFrame(() => composerRef.current?.focus());
                                            }}
                                        >
                                            <span>{prompt}</span>
                                            <ArrowUpRight size={15} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div hidden={!messages.length && !busy} className="assistant-messages" role="log" aria-live="polite">
                            {messages.map(message => (
                                <article key={message.id} className={`assistant-message ${message.role}`}>
                                    {message.role === 'user' ? (
                                        <div className="assistant-bubble-user">
                                            <p>{message.text}</p>
                                        </div>
                                    ) : (
                                        <div className="assistant-response">
                                            <div className="assistant-response-avatar" aria-hidden="true">
                                                <Sparkles size={14} />
                                            </div>
                                            <div className="assistant-response-body">
                                                <div className="assistant-response-meta">
                                                    <strong>{agentLabel}</strong>
                                                    <button
                                                        type="button"
                                                        className="assistant-read-btn"
                                                        aria-label="Read reply aloud"
                                                        disabled={voiceActive || wakeActive}
                                                        onClick={() => speak(message.text)}
                                                    >
                                                        <Volume2 size={13} />
                                                        <span>Read aloud</span>
                                                    </button>
                                                </div>
                                                <div className="assistant-response-text">
                                                    <MarkdownRenderer content={message.text} />
                                                </div>
                                                {!!message.actions?.length && (
                                                    <div className="assistant-actions">
                                                        <div className="assistant-actions-header">
                                                            <strong>{message.applied ? 'Reviewed actions' : 'Review proposed actions'}</strong>
                                                        </div>
                                                        <div className="assistant-actions-list">
                                                            {message.actions.map((action, index) => (
                                                                <div key={index} className="assistant-action-item">
                                                                    <span className="assistant-action-badge">{action.type.replaceAll('_', ' ')}</span>
                                                                    <span className="assistant-action-desc">
                                                                        {action.type === 'complete_task'
                                                                            ? canvases[message.projectId || '']?.todos?.find(task => task.id === action.taskId)?.text || 'Task no longer available'
                                                                            : action.type === 'create_flow'
                                                                                ? 'Connected idea map'
                                                                                : action.text || canvases[message.projectId || '']?.name}
                                                                        {action.date ? ` · ${action.date}` : ''}
                                                                        {action.time ? ` ${action.time}` : ''}
                                                                        {action.type === 'add_reminder' ? ` · ${action.repeat || 'once'} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : ''}
                                                                    </span>
                                                                    {action.type === 'create_flow' && (
                                                                        <span className="sasha-flow-preview">
                                                                            {action.text.split('\n').filter(Boolean).map((label, i) => (
                                                                                <span key={i}>{i > 0 ? '↳ ' : ''}{label}</span>
                                                                            ))}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="assistant-actions-footer">
                                                            <button
                                                                type="button"
                                                                className="assistant-action-apply"
                                                                disabled={!ready || message.applied || busy || applying}
                                                                onClick={() => void apply(message)}
                                                            >
                                                                <Check size={15} />
                                                                {message.applied ? 'Applied once' : 'Apply these actions'}
                                                            </button>
                                                            {message.applied && message.undo && (
                                                                <button type="button" disabled={applying || busy} onClick={() => void apply(message, true)}>
                                                                    <RotateCcw size={14} />Undo changes
                                                                </button>
                                                            )}
                                                            {!message.applied && (
                                                                <button
                                                                    type="button"
                                                                    disabled={applying}
                                                                    onClick={() => setMessages(previous => previous.map(item => item.id === message.id ? { ...item, actions: [] } : item))}
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            ))}
                            {busy && (
                                <div className="assistant-thinking" role="status">
                                    <div className="assistant-response-avatar" aria-hidden="true">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="assistant-thinking-dots" aria-hidden="true">
                                        <span /><span /><span />
                                    </div>
                                    <span>Thinking…</span>
                                </div>
                            )}
                        </div>

                        {error && <p role="alert" className="assistant-error">{error}</p>}
                        <div ref={end} />

                        <div className="sasha-inline-compose">
                            {loader.error && (
                                <div role="alert" className="assistant-error assistant-loader-error">
                                    <span>{loader.error}</span>
                                    <button type="button" onClick={loader.retry}>Retry project</button>
                                </div>
                            )}
                            <div className="assistant-composer-box">
                                <textarea
                                    ref={composerRef}
                                    rows={2}
                                    maxLength={3000}
                                    disabled={busy || applying}
                                    value={draft}
                                    aria-label="Your request"
                                    placeholder={`Message ${agentLabel}…`}
                                    onChange={event => setDraft(event.target.value)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            void send();
                                        }
                                    }}
                                />
                                <div className="assistant-compose-tools">
                                    <div className="assistant-compose-left">
                                        <AssistantProjectPicker
                                            projects={projects}
                                            value={projectId}
                                            disabled={busy || applying || voiceActive}
                                            onChange={id => { reset(); setProjectId(id); }}
                                        />
                                        {!busy && !applying && !voiceActive && !wakeActive && (
                                            <VoiceTyping
                                                destination="your request"
                                                onInsert={text => setDraft(previous => `${previous} ${text}`.trim().slice(0, 3000))}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={`assistant-tool-pill ${readAloud ? 'active' : ''}`}
                                            aria-pressed={readAloud}
                                            title={readAloud ? 'Speak replies is on (click to turn off)' : 'Speak replies aloud'}
                                            onClick={() => {
                                                if (readAloud) window.speechSynthesis?.cancel();
                                                setReadAloud(value => !value);
                                            }}
                                        >
                                            {readAloud ? <Volume2 size={15} /> : <VolumeX size={15} />}
                                            <span>Speak replies</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="assistant-tool-pill"
                                            title="Open project & workspace execution monitor"
                                            onClick={() => navigate('/dashboard?tab=monitor')}
                                        >
                                            <Activity size={14} />
                                            <span>Monitor</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="assistant-tool-pill"
                                            title="Open AI reports for this project"
                                            onClick={() => navigate(projectId ? `/ai/${encodeURIComponent(projectId)}?tab=reports` : '/reports')}
                                        >
                                            <BarChart2 size={14} />
                                            <span>Reports</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="assistant-tool-pill"
                                            onClick={() => navigate('/ai')}
                                        >
                                            <span>AI capsules</span>
                                            <ArrowUpRight size={13} />
                                        </button>
                                    </div>
                                    <div className="assistant-compose-right">
                                        {!!messages.length && !busy && (
                                            <button
                                                type="button"
                                                className="assistant-tool-pill"
                                                disabled={applying}
                                                onClick={async () => {
                                                    if (await useModalStore.getState().confirm('Clear this conversation? Your projects will stay saved.')) reset();
                                                }}
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {busy ? (
                                            <button type="button" className="assistant-stop-btn" onClick={() => request.current?.abort()}>
                                                <Square size={13} />
                                                <span>Stop</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="assistant-send"
                                                aria-label="Send message"
                                                disabled={!draft.trim() || !ready || applying}
                                                onClick={() => void send()}
                                            >
                                                <Send size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="sasha-credit-note">
                                {access && !access.pro ? `Free trial · ${access.remaining?.chat ?? 0} of ${limits.chat} chat credits left · 1 credit per request` : `${limits.chat} chat credits/day · 1 credit per request · Resets 00:00 UTC (5:30 AM India)`}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>}
    </>;
}
