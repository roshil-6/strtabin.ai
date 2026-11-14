import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUpRight, Plus, UsersRound, SquareKanban, ClipboardCheck, ScrollText, MessageCircle, Check, Loader2, RefreshCw, UserPlus, Download, Upload,
    BrainCircuit as Capsule, Search, ChevronLeft, ChevronRight, ChevronDown, Link2, Copy, MoreHorizontal, Trash2, Pencil, LogOut, Shield, ShieldOff,
    UserMinus, X, LayoutGrid, List as ListIcon, CalendarDays, CalendarRange, Lock, History, Mail, Clock, GripVertical, MailPlus, LayoutDashboard, CalendarCheck2, Sparkles, Hourglass, type LucideIcon,
} from 'lucide-react';
import { workspaceService, type Workspace, type Project, type ProjectStatus, type MemberDailyTask, type Invitation, type WorkspaceMember, type ActivityLog } from '../services/workspaceService';
import { type ChatUser } from '../services/chatService';
import { localDateKey } from '../lib/localDate';
import { sanitizeExternalReports, type ExternalAiReport } from '../lib/projectAiPackage';
import useStore from '../store/useStore';
import TeamDialog from './TeamDialog';
import MarkdownRenderer from './MarkdownRenderer';
import { useStageDrag } from '../hooks/useStageDrag';
import './TeamWorkspace.css';
import './StageDrag.css';

export type TeamView = 'teams' | 'projects' | 'duties' | 'reports';
type Detail = Awaited<ReturnType<typeof workspaceService.getWorkspace>>;
type Modal = 'team' | 'join' | 'project' | 'duty' | 'invite' | 'report' | 'rename';
type Confirm = { title: string; body: string; action: string; run: () => Promise<void> };
type SentInvitation = { id: number; invitee_email: string | null; invitee_username: string | null; created_at: string };

const EMPTY_REPORTS: ExternalAiReport[] = [];
const STAGES: { id: ProjectStatus; label: string }[] = [
    { id: 'idea', label: 'Idea' }, { id: 'planning', label: 'Planning' }, { id: 'executing', label: 'In progress' }, { id: 'completed', label: 'Done' },
];
const STAGE_IDS = STAGES.map(stage => stage.id);
const stageLabel = (status: ProjectStatus) => STAGES.find(stage => stage.id === status)?.label || status;
const HEADINGS: Record<TeamView, [string, string]> = {
    teams: ['Overview', 'Who is on the team, what is moving and what needs attention today.'],
    projects: ['Shared projects', 'Every project the team works on, with an owner and a stage.'],
    duties: ['Duties', 'Daily work with a clear owner. Tick it off when it is done.'],
    reports: ['Reports', 'Write-ups and AI answers saved with the project they belong to.'],
};

const nameOf = (member?: { username: string | null; email?: string | null } | null) => member?.username || member?.email || 'Teammate';
const initials = (name: string) => name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'T';
const HUES = [262, 200, 150, 30, 330, 100, 220, 10];
const hueFor = (id: number) => HUES[Math.abs(id) % HUES.length];

function shiftDate(key: string, days: number) {
    const [y, m, d] = key.split('-').map(Number);
    const next = new Date(y, m - 1, d + days);
    return localDateKey(next);
}
function weekStart(key: string) {
    const [y, m, d] = key.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return shiftDate(key, -((day + 6) % 7));
}
function prettyDate(key: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, options);
}
function relativeTime(value: string) {
    const time = new Date(value.includes('T') || value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`).getTime();
    if (Number.isNaN(time)) return '';
    const seconds = Math.round((Date.now() - time) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} d ago`;
    return new Date(time).toLocaleDateString();
}
function describeActivity(activity: ActivityLog) {
    const meta = (activity.metadata || {}) as Record<string, unknown>;
    const title = typeof meta.title === 'string' ? `“${meta.title}”` : 'a project';
    switch (activity.action) {
        case 'created_project': return `created ${title}`;
        case 'deleted_project': return `deleted ${title}`;
        case 'assigned_project': return 'changed a project owner';
        case 'updated_project_status': return typeof meta.status === 'string' ? `moved a project to ${stageLabel(meta.status as ProjectStatus)}` : 'updated a project stage';
        case 'updated_project': return 'updated a project';
        case 'invited_member': return `invited ${typeof meta.username === 'string' ? meta.username : typeof meta.email === 'string' ? meta.email : 'a teammate'}`;
        case 'joined_workspace': return 'joined the team';
        case 'left_workspace': return 'left the team';
        case 'removed_member': return 'removed a member';
        case 'updated_member_role': return meta.role === 'admin' ? 'made a teammate an admin' : 'changed a teammate’s role';
        case 'shared_report': return 'shared a report';
        case 'created_workspace': return 'created the team';
        case 'completed_duty': return typeof meta.text === 'string' ? `completed “${meta.text}”` : 'completed a duty';
        case 'assigned_duty': return typeof meta.assignee === 'string' ? `gave ${meta.assignee} a duty` : 'assigned a duty';
        default: return activity.action.replace(/_/g, ' ');
    }
}

function Avatar({ id, name, size = 'md' }: { id: number; name: string; size?: 'sm' | 'md' | 'lg' }) {
    return <span className={`th-avatar th-avatar-${size}`} style={{ '--hue': hueFor(id) } as React.CSSProperties} aria-hidden="true">{initials(name)}</span>;
}

function Menu({ label, children, icon = <MoreHorizontal size={17} /> }: { label: string; children: (close: () => void) => ReactNode; icon?: ReactNode }) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => { if (!(event.target instanceof Node && root.current?.contains(event.target))) setOpen(false); };
        const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
    }, [open]);
    return <div className="th-menu" ref={root}>
        <button type="button" className="th-icon-button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>{icon}</button>
        {open && <div className="th-menu-list" role="menu">{children(() => setOpen(false))}</div>}
    </div>;
}

type Tone = 'violet' | 'green' | 'blue' | 'amber' | 'pink' | 'teal';
/** A tinted square behind an icon, so each area of the team hub is easy to tell apart at a glance. */
function Tile({ icon: Icon, tone, size = 16 }: { icon: LucideIcon; tone: Tone; size?: number }) {
    return <span className={`th-tile th-tile-${tone}`} aria-hidden="true"><Icon size={size} strokeWidth={2.1} /></span>;
}
const VIEW_ICONS: Record<TeamView, [LucideIcon, Tone]> = { teams: [LayoutDashboard, 'violet'], projects: [SquareKanban, 'violet'], duties: [ClipboardCheck, 'green'], reports: [ScrollText, 'amber'] };

function Progress({ value, total, label }: { value: number; total: number; label: string }) {
    const percent = total ? Math.round((value / total) * 100) : 0;
    return <div className="th-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>;
}

export default function TeamWorkspace({ view, openChat, openGroup, onNavigate, initialTeamId }: {
    view: TeamView; openChat: (user: ChatUser) => void; openGroup: () => void; onNavigate?: (view: TeamView) => void; initialTeamId?: number | null;
}) {
    const { getToken, isSignedIn } = useAuth();
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [workspaceId, setWorkspaceId] = useState<number | null>(initialTeamId || null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [tasks, setTasks] = useState<MemberDailyTask[]>([]);
    const [sentInvites, setSentInvites] = useState<SentInvitation[]>([]);
    const [date, setDate] = useState(localDateKey);
    const [dutyMode, setDutyMode] = useState<'day' | 'week'>('day');
    const [dutyFilter, setDutyFilter] = useState<'all' | 'mine' | number>('all');
    const [projectLayout, setProjectLayout] = useState<'board' | 'list'>('board');
    const [stageFilter, setStageFilter] = useState<ProjectStatus | 'all'>('all');
    const [loading, setLoading] = useState(Boolean(isSignedIn));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState<Modal | null>(null);
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [notice, setNotice] = useState('');
    // Clock for the trial countdown; refreshed each minute so render stays pure.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
    const [query, setQuery] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [assignee, setAssignee] = useState('');
    const [quickDuty, setQuickDuty] = useState('');
    const [quickAssignee, setQuickAssignee] = useState('');
    const [editingDuty, setEditingDuty] = useState<{ id: number; text: string } | null>(null);
    const [projectType, setProjectType] = useState<'strategy' | 'code' | 'notes'>('strategy');
    const [reportProjectId, setReportProjectId] = useState<number | null>(null);
    const [reports, setReports] = useState<ExternalAiReport[]>(EMPTY_REPORTS);
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const request = useRef(0);
    const reportRequest = useRef(0);
    const importInput = useRef<HTMLInputElement>(null);
    const invalidate = useCallback(() => { request.current++; }, []);
    const invalidateReports = useCallback(() => { reportRequest.current++; }, []);
    const flash = useCallback((message: string) => { setNotice(message); }, []);
    useEffect(() => { if (!notice || modal) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice, modal]);

    const reloadWorkspaces = useCallback(async () => {
        if (!isSignedIn) return;
        try {
            const token = await getToken(); if (!token) throw new Error('Sign in to load your teams.');
            const [data, incoming] = await Promise.all([workspaceService.getWorkspaces(token), workspaceService.getInvitations(token)]);
            setInvitations((incoming.invitations || []).filter((item: Invitation) => item.status === 'pending'));
            const teams: Workspace[] = (data.workspaces || []).filter((item: Workspace) => item.type === 'team');
            setWorkspaces(teams);
            setWorkspaceId(previous => teams.some(item => item.id === previous) ? previous : teams[0]?.id || null);
            setError('');
        } catch (error) { setError(error instanceof Error ? error.message : 'Could not load teams.'); }
        finally { setLoading(false); }
    }, [getToken, isSignedIn]);
    useEffect(() => { void reloadWorkspaces(); }, [reloadWorkspaces]);

    const range = useMemo(() => dutyMode === 'week' ? { from: weekStart(date), to: shiftDate(weekStart(date), 6) } : null, [dutyMode, date]);
    const refresh = useCallback(async () => {
        if (!workspaceId) return;
        const revision = ++request.current;
        try {
            const token = await getToken(); if (!token) throw new Error('Sign in again to load your team.');
            const [next, duties] = await Promise.all([
                workspaceService.getWorkspace(workspaceId, token),
                workspaceService.getDailyTasks(workspaceId, token, range ? range : { date }),
            ]);
            if (revision !== request.current) return;
            setDetail(next); setTasks(duties.tasks || []);
            setReportProjectId(previous => next.projects.some(item => item.id === previous) ? previous : next.projects[0]?.id || null);
            if (next.currentUserRole === 'admin') {
                const sent = await workspaceService.getWorkspaceInvitations(workspaceId, token).catch(() => ({ invitations: [] }));
                if (revision === request.current) setSentInvites(sent.invitations || []);
            } else setSentInvites([]);
            setError('');
        } catch (error) { if (revision === request.current) setError(error instanceof Error ? error.message : 'Could not refresh this team.'); }
    }, [getToken, workspaceId, date, range]);
    useEffect(() => {
        void refresh();
        const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
        return () => { invalidate(); clearInterval(timer); };
    }, [refresh, invalidate]);

    const current = detail?.workspace.id === workspaceId ? detail : null;
    const admin = current?.currentUserRole === 'admin';
    const me = current?.currentUserId ?? null;
    const ownerId = current?.workspace.owner_id ?? null;
    const members = useMemo(() => current?.members || [], [current]);
    const memberById = useMemo(() => new Map(members.map(member => [member.id, member])), [members]);

    const loadReports = useCallback(async () => {
        const revision = ++reportRequest.current;
        if (!reportProjectId || view !== 'reports') return;
        setReportLoading(true);
        try {
            const token = await getToken(); if (!token) throw new Error('Sign in again to load reports.');
            const data = await workspaceService.getProjectCanvas(reportProjectId, token);
            if (revision === reportRequest.current) { setReports(sanitizeExternalReports(data.externalAiReports)); setError(''); }
        } catch (error) { if (revision === reportRequest.current) { setReports([]); setError(error instanceof Error ? error.message : 'Could not load reports.'); } }
        finally { if (revision === reportRequest.current) setReportLoading(false); }
    }, [getToken, reportProjectId, view]);
    useEffect(() => { void loadReports(); return invalidateReports; }, [loadReports, invalidateReports]);

    const perform = async (operation: () => Promise<void>) => {
        if (busy) return false;
        setBusy(true); setNotice('');
        try { await operation(); return true; }
        catch (error) { setNotice(error instanceof Error ? error.message.replace(/ \(\d{3}\)$/, '') : 'Could not save. Please try again.'); return false; }
        finally { setBusy(false); }
    };
    const token = async () => { const value = await getToken(); if (!value) throw new Error('Sign in again to keep working with your team.'); return value; };
    const open = (next: Modal) => {
        setTitle(next === 'rename' ? current?.workspace.name || '' : ''); setBody(''); setNotice(''); setProjectType('strategy');
        setAssignee(next === 'project' ? '' : String(me || '')); setModal(next);
    };
    const inviteLink = workspaceId ? `${window.location.origin}/join/${workspaceId}` : '';
    const copy = async (text: string, message: string) => {
        try { await navigator.clipboard.writeText(text); flash(message); } catch { flash('Copy failed. Select the text and copy it yourself.'); }
    };

    const submit = () => perform(async () => {
        const auth = await token();
        if (modal === 'team') {
            const data = await workspaceService.createWorkspace({ name: title.trim(), type: 'team', visibility: 'private' }, auth);
            await reloadWorkspaces(); const id = data.workspaceId || data.workspace?.id; if (id) setWorkspaceId(id);
        } else if (modal === 'join') {
            const id = Number(title.trim().replace(/.*\/join\//, ''));
            if (!Number.isSafeInteger(id) || id < 1) throw new Error('Paste an invite link or enter the team ID (a number).');
            await workspaceService.joinWorkspace(id, auth); await reloadWorkspaces(); setWorkspaceId(id);
        } else {
            if (!workspaceId || !current) throw new Error('Choose a team first.');
            if (modal === 'rename') await workspaceService.updateWorkspace(workspaceId, { name: title.trim() }, auth);
            if (modal === 'project') await workspaceService.createProject(workspaceId, { title: title.trim(), description: body.trim(), type: projectType, assignedTo: assignee ? Number(assignee) : null }, auth);
            if (modal === 'duty') await workspaceService.createDailyTask(workspaceId, { taskText: title.trim(), taskDate: date, userId: Number(assignee) || me || undefined }, auth);
            if (modal === 'invite') await workspaceService.inviteMember(workspaceId, title.includes('@') ? { email: title.trim() } : { username: title.trim().replace(/^@/, '') }, auth);
            if (modal === 'report') {
                if (!reportProjectId) throw new Error('Select a project for this report.');
                const data = await workspaceService.createReport(reportProjectId, { title: title.trim(), content: body, provider: 'other' }, auth);
                const saved = sanitizeExternalReports(data.reports); setReports(saved);
                const canvasId = `proj_${reportProjectId}`;
                if (useStore.getState().canvases[canvasId]) useStore.setState(state => ({ canvases: { ...state.canvases, [canvasId]: { ...state.canvases[canvasId], externalAiReports: saved } } }));
            }
            if (modal === 'rename') await reloadWorkspaces();
            await refresh();
        }
        const done = { invite: 'Invitation sent. They can accept it from their Teams tab.', rename: 'Team renamed.', team: 'Team created.', join: 'You joined the team.', project: 'Project created.', duty: 'Duty added.', report: 'Report published.' } as const;
        setModal(null); flash(modal ? done[modal] : 'Saved.');
    });

    const respondToInvitation = (invitation: Invitation, accept: boolean) => perform(async () => {
        const auth = await token();
        if (accept) await workspaceService.acceptInvitation(invitation.id, auth); else await workspaceService.rejectInvitation(invitation.id, auth);
        await reloadWorkspaces(); if (accept) setWorkspaceId(invitation.workspace_id);
        flash(accept ? 'You joined the team.' : 'Invitation declined.');
    });
    const updateTask = (task: MemberDailyTask, data: { status?: 'pending' | 'done'; taskText?: string }) => perform(async () => {
        if (!workspaceId) return;
        setTasks(list => list.map(item => item.id === task.id ? { ...item, ...(data.status ? { status: data.status } : {}), ...(data.taskText ? { task_text: data.taskText } : {}) } : item));
        try { await workspaceService.updateDailyTask(workspaceId, task.id, data, await token()); }
        finally { await refresh(); }
    });
    const addQuickDuty = () => perform(async () => {
        if (!workspaceId || !quickDuty.trim()) return;
        await workspaceService.createDailyTask(workspaceId, { taskText: quickDuty.trim(), taskDate: dutyMode === 'week' ? localDateKey() : date, userId: Number(quickAssignee) || me || undefined }, await token());
        setQuickDuty(''); await refresh();
    });
    const updateProject = (project: Project, data: { status?: ProjectStatus; assignedTo?: number | null }) => perform(async () => {
        if (!current) return;
        setDetail(previous => previous && ({ ...previous, projects: previous.projects.map(item => item.id === project.id ? { ...item, ...(data.status ? { status: data.status } : {}), ...('assignedTo' in data ? { assigned_to: data.assignedTo ?? null, assigned_to_username: data.assignedTo ? nameOf(memberById.get(data.assignedTo)) : null } : {}) } : item) }));
        try { await workspaceService.updateProject(project.id, data, await token()); }
        finally { await refresh(); }
    });
    const ask = (next: Confirm) => { setNotice(''); setConfirm(next); };
    const runConfirm = async () => { if (!confirm) return; const ok = await perform(confirm.run); if (ok) setConfirm(null); };

    const removeMember = (member: WorkspaceMember) => ask({
        title: `Remove ${nameOf(member)}?`, action: 'Remove from team',
        body: `${nameOf(member)} loses access to this team’s projects, duties and reports. Projects they own become unassigned. You can invite them again later.`,
        run: async () => { await workspaceService.removeMember(workspaceId!, member.id, await token()); await refresh(); flash(`${nameOf(member)} was removed from the team.`); },
    });
    const leaveTeam = () => ask({
        title: `Leave ${current?.workspace.name || 'this team'}?`, action: 'Leave team',
        body: 'You lose access to this team’s projects, duties and reports until someone invites you again.',
        run: async () => { await workspaceService.removeMember(workspaceId!, me!, await token()); invalidate(); setDetail(null); setWorkspaceId(null); await reloadWorkspaces(); flash('You left the team.'); },
    });
    const changeRole = (member: WorkspaceMember, role: 'admin' | 'member') => perform(async () => {
        await workspaceService.updateMemberRole(workspaceId!, member.id, role, await token()); await refresh();
        flash(role === 'admin' ? `${nameOf(member)} is now an admin.` : `${nameOf(member)} is now a member.`);
    });
    const cancelInvite = (invite: SentInvitation) => perform(async () => {
        await workspaceService.cancelWorkspaceInvitation(workspaceId!, invite.id, await token()); await refresh(); flash('Invitation cancelled.');
    });
    const deleteProject = (project: Project) => ask({
        title: `Delete “${project.title}”?`, action: 'Delete project',
        body: 'This permanently deletes the project, its writing, board, tasks and saved reports for everyone on the team. This cannot be undone.',
        run: async () => { await workspaceService.deleteProject(project.id, await token()); await refresh(); flash('Project deleted.'); },
    });
    const deleteDuty = (task: MemberDailyTask) => ask({
        title: 'Delete this duty?', action: 'Delete duty', body: `“${task.task_text}” will be removed for everyone.`,
        run: async () => { await workspaceService.deleteDailyTask(workspaceId!, task.id, await token()); await refresh(); flash('Duty deleted.'); },
    });

    const canEditDuty = (task: MemberDailyTask) => admin || (task.user_id === me && task.assigned_by === me);
    const canTickDuty = (task: MemberDailyTask) => admin || task.user_id === me;
    const projectLink = (project: Project) => navigate(`/strategy/proj_${project.id}`, { state: { workspaceId: project.workspace_id } });
    const capsuleLink = (projectId: number) => navigate(`/ai/proj_${projectId}`, { state: { workspaceId } });
    const switchTeam = (id: number) => { invalidate(); setDetail(null); setTasks([]); setSentInvites([]); setWorkspaceId(id); setReports([]); setSelectedReport(null); setQuery(''); setSwitcherOpen(false); };

    const allProjects = current?.projects || [];
    const matching = allProjects.filter(project => `${project.title} ${project.description || ''} ${project.assigned_to_username || ''}`.toLowerCase().includes(query.toLowerCase()));
    const filteredProjects = matching.filter(project => stageFilter === 'all' || project.status === stageFilter);
    const plan = current?.plan;
    const trialHoursLeft = plan?.trial && plan.trialEndsAt ? Math.max(0, Math.ceil((Date.parse(plan.trialEndsAt) - now) / 3600000)) : 0;
    const trialEnded = Boolean(plan?.trial && plan.expired);
    const projectLimitReached = Boolean(plan?.trial && plan.projectLimit !== undefined && allProjects.length >= plan.projectLimit);
    const newProject = () => {
        if (trialEnded) { setNotice('This team\'s free trial has ended. The owner can upgrade to Pro to keep working together.'); return; }
        if (projectLimitReached) { setNotice(`The free team trial includes ${plan?.projectLimit} shared project. Upgrade to Pro for unlimited team projects.`); return; }
        open('project');
    };
    const stageDrag = useStageDrag<ProjectStatus>({
        stages: STAGE_IDS,
        disabled: busy,
        onMove: (id, stage) => {
            const project = allProjects.find(item => String(item.id) === id);
            if (!project || project.status === stage) return;
            void updateProject(project, { status: stage }).then(ok => { if (ok) setNotice(`Moved "${project.title}" to ${stageLabel(stage)}.`); });
        },
    });
    const visibleReports = reports.filter(report => !report.archived && `${report.title} ${report.content}`.toLowerCase().includes(query.toLowerCase()));
    const viewedReport = reports.find(report => report.id === selectedReport) || null;
    const today = localDateKey();
    const todayTasks = tasks.filter(task => task.task_date === (dutyMode === 'week' ? today : date));
    const filteredTasks = tasks.filter(task => dutyFilter === 'all' ? true : dutyFilter === 'mine' ? task.user_id === me : task.user_id === dutyFilter);
    const myToday = todayTasks.filter(task => task.user_id === me);
    const overviewDate = dutyMode === 'week' ? today : date;

    const dutyRow = (task: MemberDailyTask, compact = false) => {
        const done = task.status === 'done';
        const editing = editingDuty?.id === task.id;
        return <li key={task.id} className={`th-duty ${done ? 'is-done' : ''} ${compact ? 'is-compact' : ''}`}>
            <button type="button" className="th-check" aria-pressed={done} aria-label={`${done ? 'Reopen' : 'Complete'} ${task.task_text}`} disabled={busy || !canTickDuty(task)}
                title={canTickDuty(task) ? undefined : 'Only the assignee or an admin can change this'} onClick={() => void updateTask(task, { status: done ? 'pending' : 'done' })}>{done && <Check size={14} />}</button>
            {editing ? <form className="th-duty-edit" onSubmit={event => { event.preventDefault(); const text = editingDuty!.text.trim(); setEditingDuty(null); if (text && text !== task.task_text) void updateTask(task, { taskText: text }); }}>
                <input autoFocus aria-label="Duty text" value={editingDuty!.text} maxLength={2000} onChange={event => setEditingDuty({ id: task.id, text: event.target.value })} onKeyDown={event => { if (event.key === 'Escape') setEditingDuty(null); }} />
                <button type="submit" className="th-icon-button" aria-label="Save duty"><Check size={16} /></button>
                <button type="button" className="th-icon-button" aria-label="Cancel editing" onClick={() => setEditingDuty(null)}><X size={16} /></button>
            </form> : <div className="th-duty-text">
                <span>{task.task_text}</span>
                {!compact && <small>{task.assigned_by && task.assigned_by !== task.user_id ? `From ${task.assigned_by_username || 'an admin'}` : 'Added by themselves'}{dutyMode === 'week' ? ` · ${prettyDate(task.task_date)}` : ''}</small>}
            </div>}
            {!editing && canEditDuty(task) && <div className="th-row-actions">
                <button type="button" className="th-icon-button" aria-label={`Edit ${task.task_text}`} onClick={() => setEditingDuty({ id: task.id, text: task.task_text })}><Pencil size={15} /></button>
                <button type="button" className="th-icon-button is-danger" aria-label={`Delete ${task.task_text}`} onClick={() => deleteDuty(task)}><Trash2 size={15} /></button>
            </div>}
        </li>;
    };

    const projectCard = (project: Project, onBoard = false) => <article key={project.id} className="th-project" {...(onBoard ? stageDrag.itemProps(String(project.id), project.status) : {})}>
        <header>
            <span className={`th-stage th-stage-${project.status}`}>{stageLabel(project.status)}</span>
            {onBoard && <button {...stageDrag.handleProps(String(project.id), project.status, project.title)}><GripVertical size={16} /></button>}
            <Menu label={`More actions for ${project.title}`}>{close => <>
                <button role="menuitem" onClick={() => { close(); projectLink(project); }}><ArrowUpRight size={15} />Open project</button>
                <button role="menuitem" onClick={() => { close(); capsuleLink(project.id); }}><Capsule size={15} />Prepare AI capsule</button>
                <button role="menuitem" onClick={() => { close(); setReportProjectId(project.id); onNavigate?.('reports'); }}><ScrollText size={15} />See reports</button>
                {admin && <button role="menuitem" className="is-danger" onClick={() => { close(); deleteProject(project); }}><Trash2 size={15} />Delete project</button>}
            </>}</Menu>
        </header>
        <button type="button" className="th-project-title" onClick={() => projectLink(project)}>{project.title}</button>
        {project.description && <p>{project.description}</p>}
        <footer>
            <label className="th-inline-select" title="Owner">
                {project.assigned_to ? <Avatar id={project.assigned_to} name={project.assigned_to_username || 'T'} size="sm" /> : <span className="th-avatar th-avatar-sm th-avatar-empty" aria-hidden="true">?</span>}
                <select aria-label={`Owner of ${project.title}`} value={project.assigned_to || ''} disabled={busy} onChange={event => void updateProject(project, { assignedTo: event.target.value ? Number(event.target.value) : null })}>
                    <option value="">No owner</option>
                    {members.map(member => <option key={member.id} value={member.id}>{nameOf(member)}</option>)}
                </select>
            </label>
            <label className="th-inline-select" title="Stage">
                <select aria-label={`Stage of ${project.title}`} value={project.status} disabled={busy} onChange={event => void updateProject(project, { status: event.target.value as ProjectStatus })}>
                    {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
            </label>
        </footer>
    </article>;

    if (!isSignedIn) return <div className="team-workspace th">
        <section className="th-welcome">
            <span className="th-welcome-icon"><UsersRound size={28} /></span>
            <h2>Work on projects with your team</h2>
            <p>Sign in to create a team, invite people and share projects, duties and reports. Your personal projects stay private.</p>
            <button className="team-primary" onClick={() => navigate('/auth')}>Sign in to start a team<ArrowUpRight size={16} /></button>
            <div className="th-welcome-grid">
                {([[SquareKanban, 'Shared projects', 'Plans, writing and boards everyone can open.'], [ClipboardCheck, 'Daily duties', 'Give each task an owner and a date.'], [Capsule, 'AI capsules', 'Send full project context to your AI.'], [MessageCircle, 'Team chat', 'Direct and group conversations.']] as const).map(([Icon, label, hint]) =>
                    <div key={label}><Icon size={20} /><h3>{label}</h3><p>{hint}</p></div>)}
            </div>
        </section>
    </div>;

    return <div className="team-workspace th">
        {error && <div className="team-feedback error" role="alert">{error}<button onClick={() => { void reloadWorkspaces(); void refresh(); }}>Try again</button></div>}
        {notice && !modal && !confirm && <p className="th-toast" role="status">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={14} /></button></p>}

        {invitations.length > 0 && <section className="th-invitations" aria-label="Team invitations">
            {invitations.map(invitation => <article key={invitation.id}>
                <span className="th-invite-icon"><Mail size={17} /></span>
                <div><strong>{invitation.workspace_name}</strong><p>{invitation.inviter_username || 'A teammate'} invited you to join this team.</p></div>
                <div className="team-actions"><button disabled={busy} onClick={() => void respondToInvitation(invitation, false)}>Decline</button><button className="team-primary" disabled={busy} onClick={() => void respondToInvitation(invitation, true)}>Join team</button></div>
            </article>)}
        </section>}

        {loading ? <div className="team-loading" role="status"><Loader2 className="animate-spin" />Loading your teams…</div>
            : !workspaces.length ? <section className="th-start">
                <span className="th-welcome-icon"><UsersRound size={28} /></span>
                <h2>Start your first team</h2>
                <p>A team is a shared space for projects, daily duties and reports. Create one and invite people, or join a team with an invite link.</p>
                <div className="team-actions"><button onClick={() => open('join')}><Link2 size={16} />Join with a link</button><button className="team-primary" onClick={() => open('team')}><Plus size={16} />Create a team</button></div>
                <ol className="th-steps"><li><strong>1</strong>Create the team</li><li><strong>2</strong>Share the invite link</li><li><strong>3</strong>Add a project and give out duties</li></ol>
            </section>
            : <>
                <header className="th-teambar">
                    <div className="th-team-identity">
                        <div className="th-switcher">
                            <button type="button" className="th-switcher-button" aria-haspopup="listbox" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen(value => !value)}>
                                <span className="th-team-mark" aria-hidden="true">{initials(current?.workspace.name || workspaces.find(item => item.id === workspaceId)?.name || 'T')}</span>
                                <span className="th-team-name"><strong>{current?.workspace.name || workspaces.find(item => item.id === workspaceId)?.name || 'Loading team'}</strong>
                                    <small><Lock size={11} />{current ? `${members.length} ${members.length === 1 ? 'member' : 'members'} · ${admin ? 'You are an admin' : 'You are a member'}` : 'Loading…'}</small></span>
                                <ChevronDown size={16} />
                            </button>
                            {switcherOpen && <div className="th-switcher-list" role="listbox" aria-label="Your teams">
                                {workspaces.map(workspace => <button key={workspace.id} role="option" aria-selected={workspace.id === workspaceId} onClick={() => switchTeam(workspace.id)}>
                                    <span className="th-team-mark is-small" aria-hidden="true">{initials(workspace.name)}</span><span>{workspace.name}<small>{workspace.role === 'admin' ? 'Admin' : 'Member'}</small></span>{workspace.id === workspaceId && <Check size={15} />}
                                </button>)}
                                <hr />
                                <button onClick={() => { setSwitcherOpen(false); open('team'); }}><Plus size={15} />Create a new team</button>
                                <button onClick={() => { setSwitcherOpen(false); open('join'); }}><Link2 size={15} />Join with a link</button>
                            </div>}
                        </div>
                        {current && <div className="th-avatar-stack" aria-label={`${members.length} members`}>
                            {members.slice(0, 5).map(member => <Avatar key={member.id} id={member.id} name={nameOf(member)} size="sm" />)}
                            {members.length > 5 && <span className="th-avatar th-avatar-sm th-avatar-more">+{members.length - 5}</span>}
                        </div>}
                    </div>
                    <div className="team-actions th-teambar-actions">
                        <button aria-label="Refresh team" className="th-icon-button" onClick={() => { void refresh(); void loadReports(); }}><RefreshCw size={16} /></button>
                        {current && <button onClick={() => void copy(inviteLink, 'Invite link copied. Anyone signed in with this link can join the team.')}><Link2 size={16} /><span>Copy invite link</span></button>}
                        {current && admin && <button className="team-primary" onClick={() => open('invite')}><UserPlus size={16} /><span>Invite</span></button>}
                        {current && <Menu label="Team options">{close => <>
                            {admin && <button role="menuitem" onClick={() => { close(); open('rename'); }}><Pencil size={15} />Rename team</button>}
                            <button role="menuitem" onClick={() => { close(); void copy(String(workspaceId), 'Team ID copied.'); }}><Copy size={15} />Copy team ID ({workspaceId})</button>
                            <button role="menuitem" onClick={() => { close(); openGroup(); }}><MessageCircle size={15} />Start a group chat</button>
                            {me !== ownerId && <button role="menuitem" className="is-danger" onClick={() => { close(); leaveTeam(); }}><LogOut size={15} />Leave team</button>}
                        </>}</Menu>}
                    </div>
                </header>

                {plan?.trial && <div className={`th-trial${trialEnded ? ' is-ended' : ''}`} role="status">
                    <Tile icon={trialEnded ? Hourglass : Sparkles} tone={trialEnded ? 'amber' : 'violet'} />
                    <p>{trialEnded
                        ? <><strong>Free trial ended.</strong> This team is read-only. Everything stays visible{me === ownerId ? ' — upgrade to Pro to keep working together.' : '. The team owner can upgrade to Pro to keep working together.'}</>
                        : <><strong>Free team trial</strong> · {trialHoursLeft} {trialHoursLeft === 1 ? 'hour' : 'hours'} left · {Math.min(allProjects.length, plan.projectLimit ?? 1)} of {plan.projectLimit ?? 1} shared project. Pro removes the limits for everyone in this team.</>}</p>
                    {me === ownerId && <button type="button" onClick={() => navigate('/billing')}>{trialEnded ? 'Upgrade to Pro' : 'Get Pro'}</button>}
                </div>}

                <div className="th-heading"><div><h2><Tile icon={VIEW_ICONS[view][0]} tone={VIEW_ICONS[view][1]} size={18} />{HEADINGS[view][0]}</h2><p>{HEADINGS[view][1]}</p></div>
                    {current && view === 'projects' && <button className="team-primary" aria-disabled={trialEnded || projectLimitReached} onClick={newProject}><Plus size={16} />New project</button>}
                    {current && view === 'reports' && <button className="team-primary" disabled={!reportProjectId || reportLoading} onClick={() => open('report')}><Plus size={16} />Share report</button>}
                </div>

                {!current ? <div className="team-loading" role="status"><Loader2 className="animate-spin" />Loading team…</div> : <>

                    {view === 'teams' && <>
                        <div className="th-stats">
                            <button type="button" onClick={() => onNavigate?.('projects')}><span className="th-stat-label"><Tile icon={SquareKanban} tone="violet" />Active projects</span><strong>{allProjects.filter(project => project.status !== 'completed').length}</strong><small>{allProjects.filter(project => project.status === 'completed').length} done</small></button>
                            <button type="button" onClick={() => onNavigate?.('duties')}><span className="th-stat-label"><Tile icon={ClipboardCheck} tone="green" />Duties today</span><strong>{todayTasks.filter(task => task.status === 'done').length}<em>/{todayTasks.length}</em></strong><Progress value={todayTasks.filter(task => task.status === 'done').length} total={todayTasks.length} label="Team duties done today" /></button>
                            <div><span className="th-stat-label"><Tile icon={UsersRound} tone="blue" />Members</span><strong>{members.length}</strong><small>{members.filter(member => member.role === 'admin' || member.id === ownerId).length} admin{members.filter(member => member.role === 'admin' || member.id === ownerId).length === 1 ? '' : 's'}</small></div>
                            <div><span className="th-stat-label">{admin ? <Tile icon={MailPlus} tone="pink" /> : <Tile icon={CalendarCheck2} tone="teal" />}{admin ? 'Pending invites' : 'Your duties today'}</span><strong>{admin ? sentInvites.length : `${myToday.filter(task => task.status === 'done').length}/${myToday.length}`}</strong><small>{admin ? 'waiting to join' : 'done'}</small></div>
                        </div>
                        <div className="th-overview">
                            <div className="th-column">
                                <section className="th-panel">
                                    <div className="th-panel-heading"><h3><Tile icon={ClipboardCheck} tone="green" />Your duties · {prettyDate(overviewDate)}</h3><button onClick={() => onNavigate?.('duties')}>All duties<ChevronRight size={15} /></button></div>
                                    {myToday.length ? <ul className="th-duty-list">{myToday.map(task => dutyRow(task, true))}</ul> : <p className="th-empty-line">Nothing on your list for today.</p>}
                                    <form className="th-quick-add" onSubmit={event => { event.preventDefault(); setQuickAssignee(''); void addQuickDuty(); }}>
                                        <Plus size={16} /><input aria-label="Add a duty for yourself today" placeholder="Add a duty for yourself…" value={quickDuty} maxLength={2000} onChange={event => setQuickDuty(event.target.value)} />
                                        <button type="submit" disabled={busy || !quickDuty.trim()}>Add</button>
                                    </form>
                                </section>
                                <section className="th-panel">
                                    <div className="th-panel-heading"><h3><Tile icon={SquareKanban} tone="violet" />Projects by stage</h3><button onClick={() => onNavigate?.('projects')}>Board<ChevronRight size={15} /></button></div>
                                    {allProjects.length ? <div className="th-stage-bars">{STAGES.map(stage => { const count = allProjects.filter(project => project.status === stage.id).length; return <button type="button" key={stage.id} onClick={() => { setStageFilter(stage.id); onNavigate?.('projects'); }}>
                                        <span className={`th-stage th-stage-${stage.id}`}>{stage.label}</span><Progress value={count} total={allProjects.length} label={`${stage.label} projects`} /><strong>{count}</strong>
                                    </button>; })}</div> : <div className="th-empty-line">No shared projects yet. <button onClick={() => open('project')}>Create the first one</button></div>}
                                </section>
                                <section className="th-panel">
                                    <div className="th-panel-heading"><h3><Tile icon={History} tone="amber" />Recent activity</h3></div>
                                    {current.activities.length ? <ol className="th-activity">{current.activities.slice(0, 10).map(activity => <li key={activity.id}>
                                        <Avatar id={activity.user_id} name={activity.username || 'T'} size="sm" />
                                        <p><strong>{activity.user_id === me ? 'You' : activity.username || 'A teammate'}</strong> {describeActivity(activity)}</p>
                                        <time dateTime={activity.created_at}><Clock size={11} />{relativeTime(activity.created_at)}</time>
                                    </li>)}</ol> : <p className="th-empty-line">New projects, duties and reports show up here.</p>}
                                </section>
                            </div>
                            <div className="th-column">
                                <section className="th-panel">
                                    <div className="th-panel-heading"><h3><Tile icon={UsersRound} tone="blue" />People</h3>{admin && <button onClick={() => open('invite')}><UserPlus size={15} />Invite</button>}</div>
                                    <ul className="th-people">{members.map(member => {
                                        const theirs = todayTasks.filter(task => task.user_id === member.id);
                                        const isOwner = member.id === ownerId;
                                        const role = isOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member';
                                        return <li key={member.id}>
                                            <Avatar id={member.id} name={nameOf(member)} />
                                            <div className="th-person"><strong>{nameOf(member)}{member.id === me && <em> (you)</em>}</strong>
                                                <span><i className={`th-role th-role-${role.toLowerCase()}`}>{role}</i>{theirs.length ? `${theirs.filter(task => task.status === 'done').length}/${theirs.length} duties today` : 'No duties today'}</span>
                                                {theirs.length > 0 && <Progress value={theirs.filter(task => task.status === 'done').length} total={theirs.length} label={`${nameOf(member)} duties done today`} />}
                                            </div>
                                            {member.id !== me && <button className="th-icon-button" aria-label={`Message ${nameOf(member)}`} onClick={() => openChat(member)}><MessageCircle size={16} /></button>}
                                            {admin && !isOwner && member.id !== me && <Menu label={`Manage ${nameOf(member)}`}>{close => <>
                                                <button role="menuitem" onClick={() => { close(); setDutyFilter(member.id); onNavigate?.('duties'); }}><ClipboardCheck size={15} />See their duties</button>
                                                {member.role === 'admin' ? <button role="menuitem" onClick={() => { close(); void changeRole(member, 'member'); }}><ShieldOff size={15} />Make member</button>
                                                    : <button role="menuitem" onClick={() => { close(); void changeRole(member, 'admin'); }}><Shield size={15} />Make admin</button>}
                                                <button role="menuitem" className="is-danger" onClick={() => { close(); removeMember(member); }}><UserMinus size={15} />Remove from team</button>
                                            </>}</Menu>}
                                        </li>;
                                    })}</ul>
                                    {admin && sentInvites.length > 0 && <div className="th-pending"><h4>Waiting to join</h4><ul>{sentInvites.map(invite => <li key={invite.id}>
                                        <span className="th-avatar th-avatar-sm th-avatar-empty" aria-hidden="true"><Mail size={12} /></span>
                                        <span>{invite.invitee_username || invite.invitee_email || 'Invited person'}<small>Invited {relativeTime(invite.created_at)}</small></span>
                                        <button disabled={busy} onClick={() => void cancelInvite(invite)}>Cancel</button>
                                    </li>)}</ul></div>}
                                    <div className="th-invite-box">
                                        <span><Link2 size={15} />Invite link</span>
                                        <code>{inviteLink}</code>
                                        <button onClick={() => void copy(inviteLink, 'Invite link copied.')}><Copy size={14} />Copy</button>
                                    </div>
                                    <button className="th-wide" onClick={openGroup}><MessageCircle size={16} />Start a group chat<ArrowUpRight size={15} /></button>
                                </section>
                            </div>
                        </div>
                    </>}

                    {view === 'projects' && <>
                        <div className="th-toolbar">
                            <label className="th-search"><Search size={16} /><input aria-label="Search shared projects" placeholder="Search projects or owners" value={query} onChange={event => setQuery(event.target.value)} /></label>
                            <div className="th-chips" role="group" aria-label="Filter by stage">
                                <button aria-pressed={stageFilter === 'all'} onClick={() => setStageFilter('all')}>All<em>{matching.length}</em></button>
                                {STAGES.map(stage => <button key={stage.id} aria-pressed={stageFilter === stage.id} onClick={() => setStageFilter(stage.id)}>{stage.label}<em>{matching.filter(project => project.status === stage.id).length}</em></button>)}
                            </div>
                            <div className="th-segmented" role="group" aria-label="Layout">
                                <button aria-pressed={projectLayout === 'board'} aria-label="Board view" onClick={() => setProjectLayout('board')}><LayoutGrid size={15} /></button>
                                <button aria-pressed={projectLayout === 'list'} aria-label="List view" onClick={() => setProjectLayout('list')}><ListIcon size={15} /></button>
                            </div>
                        </div>
                        {!filteredProjects.length ? <div className="th-empty"><Tile icon={SquareKanban} tone="violet" size={24} /><h3>{allProjects.length ? 'No projects match' : 'No shared projects yet'}</h3><p>{allProjects.length ? 'Try another search or stage.' : 'Create a project to plan, write and map ideas together.'}</p>{!allProjects.length && <button className="team-primary" onClick={() => open('project')}><Plus size={16} />New project</button>}</div>
                            : projectLayout === 'board' && stageFilter === 'all' ? <div ref={stageDrag.bindBoard} className={`th-board${stageDrag.draggingId ? ' is-dragging' : ''}`}>{STAGES.map(stage => {
                                const column = filteredProjects.filter(project => project.status === stage.id);
                                return <section key={stage.id} className="th-board-column" aria-label={stage.label} {...stageDrag.columnProps(stage.id)}>
                                    <header><span className={`th-stage th-stage-${stage.id}`}>{stage.label}</span><em>{column.length}</em></header>
                                    {column.map(project => projectCard(project, true))}
                                    {!column.length && <p className="th-column-empty">{stageDrag.draggingId ? 'Drop here' : 'Drag a project here'}</p>}
                                </section>;
                            })}</div>
                                : <div className="th-project-grid">{filteredProjects.map(project => projectCard(project))}</div>}
                    </>}

                    {view === 'duties' && <>
                        <div className="th-toolbar">
                            <div className="th-date-nav">
                                <button className="th-icon-button" aria-label={dutyMode === 'week' ? 'Previous week' : 'Previous day'} onClick={() => setDate(value => shiftDate(value, dutyMode === 'week' ? -7 : -1))}><ChevronLeft size={17} /></button>
                                <label className="th-date-label"><span>{dutyMode === 'week' && range ? `${prettyDate(range.from, { day: 'numeric', month: 'short' })} – ${prettyDate(range.to, { day: 'numeric', month: 'short' })}` : date === today ? `Today · ${prettyDate(date)}` : prettyDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                                    <input type="date" aria-label="Pick a date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
                                <button className="th-icon-button" aria-label={dutyMode === 'week' ? 'Next week' : 'Next day'} onClick={() => setDate(value => shiftDate(value, dutyMode === 'week' ? 7 : 1))}><ChevronRight size={17} /></button>
                                {date !== today && <button className="th-text-button" onClick={() => setDate(today)}>Today</button>}
                            </div>
                            <div className="th-segmented" role="group" aria-label="Range">
                                <button aria-pressed={dutyMode === 'day'} onClick={() => setDutyMode('day')}><CalendarDays size={15} />Day</button>
                                <button aria-pressed={dutyMode === 'week'} onClick={() => setDutyMode('week')}><CalendarRange size={15} />Week</button>
                            </div>
                            <label className="th-filter"><span className="sr-only">Show duties for</span>
                                <select value={String(dutyFilter)} onChange={event => { const value = event.target.value; setDutyFilter(value === 'all' || value === 'mine' ? value : Number(value)); }}>
                                    <option value="all">Everyone</option><option value="mine">Only mine</option>
                                    {members.filter(member => member.id !== me).map(member => <option key={member.id} value={member.id}>{nameOf(member)}</option>)}
                                </select></label>
                        </div>
                        <form className="th-quick-add is-large" onSubmit={event => { event.preventDefault(); void addQuickDuty(); }}>
                            <Plus size={17} />
                            <input aria-label="New duty" placeholder={dutyMode === 'week' ? 'Add a duty for today…' : `Add a duty for ${date === today ? 'today' : prettyDate(date)}…`} value={quickDuty} maxLength={2000} onChange={event => setQuickDuty(event.target.value)} />
                            {admin && <select aria-label="Assign to" value={quickAssignee || String(me || '')} onChange={event => setQuickAssignee(event.target.value)}>
                                {members.map(member => <option key={member.id} value={member.id}>{member.id === me ? 'Me' : nameOf(member)}</option>)}
                            </select>}
                            <button type="submit" className="team-primary" disabled={busy || !quickDuty.trim()}>Add duty</button>
                        </form>
                        {dutyMode === 'day' ? (() => {
                            const people = members.filter(member => dutyFilter === 'all' || (dutyFilter === 'mine' ? member.id === me : member.id === dutyFilter));
                            const groups = people.map(member => ({ member, list: filteredTasks.filter(task => task.user_id === member.id) })).filter(group => group.list.length || dutyFilter !== 'all');
                            const done = filteredTasks.filter(task => task.status === 'done').length;
                            return <>
                                {filteredTasks.length > 0 && <div className="th-day-summary"><strong>{done} of {filteredTasks.length} done</strong><Progress value={done} total={filteredTasks.length} label="Duties done" /></div>}
                                {groups.length ? <div className="th-duty-groups">{groups.map(({ member, list }) => <section key={member.id} className="th-panel th-duty-group">
                                    <header><Avatar id={member.id} name={nameOf(member)} size="sm" /><strong>{nameOf(member)}{member.id === me && <em> (you)</em>}</strong><span>{list.filter(task => task.status === 'done').length}/{list.length}</span></header>
                                    {list.length ? <ul className="th-duty-list">{list.map(task => dutyRow(task))}</ul> : <p className="th-empty-line">No duties for this day.</p>}
                                </section>)}</div>
                                    : <div className="th-empty"><Tile icon={ClipboardCheck} tone="green" size={24} /><h3>A clear day</h3><p>No duties for {date === today ? 'today' : prettyDate(date)}. Add one above and give it an owner.</p></div>}
                            </>;
                        })() : <div className="th-week">{Array.from({ length: 7 }, (_, index) => shiftDate(range!.from, index)).map(day => {
                            const list = filteredTasks.filter(task => task.task_date === day);
                            return <section key={day} className={`th-week-day ${day === today ? 'is-today' : ''}`}>
                                <header><button type="button" onClick={() => { setDate(day); setDutyMode('day'); }}><strong>{prettyDate(day, { weekday: 'short' })}</strong><span>{prettyDate(day, { day: 'numeric', month: 'short' })}</span></button><em>{list.filter(task => task.status === 'done').length}/{list.length}</em></header>
                                {list.length ? <ul className="th-duty-list">{list.map(task => <li key={task.id} className={`th-week-duty ${task.status === 'done' ? 'is-done' : ''}`}>
                                    <button type="button" className="th-check" aria-pressed={task.status === 'done'} aria-label={`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.task_text}`} disabled={busy || !canTickDuty(task)} onClick={() => void updateTask(task, { status: task.status === 'done' ? 'pending' : 'done' })}>{task.status === 'done' && <Check size={12} />}</button>
                                    <span>{task.task_text}<small>{nameOf(memberById.get(task.user_id) || { username: task.assignee_username })}</small></span>
                                </li>)}</ul> : <p className="th-column-empty">Free</p>}
                            </section>;
                        })}</div>}
                        <p className="th-footnote">{admin ? 'As an admin you can give duties to anyone and edit or delete any duty.' : 'You can add duties for yourself. Admins can give you duties too; tick them off when they are done.'}</p>
                    </>}

                    {view === 'reports' && <>
                        {!allProjects.length ? <div className="th-empty"><Tile icon={ScrollText} tone="amber" size={24} /><h3>Reports live inside projects</h3><p>Create a shared project first, then publish reports and AI answers to it.</p><button className="team-primary" onClick={() => open('project')}><Plus size={16} />New project</button></div> : <>
                            <div className="th-toolbar">
                                <label className="th-filter"><span className="sr-only">Project</span><select value={reportProjectId || ''} onChange={event => { setReports([]); setSelectedReport(null); setReportProjectId(Number(event.target.value)); }}>{allProjects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
                                <label className="th-search"><Search size={16} /><input aria-label="Search reports" placeholder="Search reports" value={query} onChange={event => setQuery(event.target.value)} /></label>
                                <button disabled={!reportProjectId} onClick={() => reportProjectId && capsuleLink(reportProjectId)}><Capsule size={16} />Prepare AI capsule</button>
                            </div>
                            {reportLoading ? <div className="team-loading" role="status"><Loader2 className="animate-spin" />Loading reports…</div> : !visibleReports.length ? <div className="th-empty"><Tile icon={ScrollText} tone="amber" size={24} /><h3>{query ? 'No reports match' : 'No reports in this project yet'}</h3><p>{query ? 'Try another search.' : 'Write an update, paste an answer from your AI, or import a text file.'}</p>{!query && <button className="team-primary" onClick={() => open('report')}><Plus size={16} />Share report</button>}</div>
                                : <div className={`th-reports ${viewedReport ? 'has-detail' : ''}`}>
                                    <ul className="th-report-list">{visibleReports.map(report => <li key={report.id}><button aria-pressed={selectedReport === report.id} onClick={() => setSelectedReport(report.id)}>
                                        <ScrollText size={18} /><span><strong>{report.title}</strong><small>{new Date(report.createdAt).toLocaleDateString()} · {report.content.length.toLocaleString()} characters</small></span><ChevronRight size={16} />
                                    </button></li>)}</ul>
                                    {viewedReport && <article className="th-report-detail">
                                        <header><button className="th-icon-button th-report-back" aria-label="Back to report list" onClick={() => setSelectedReport(null)}><ChevronLeft size={17} /></button><h3>{viewedReport.title}</h3>
                                            <button className="th-icon-button" aria-label="Copy report" onClick={() => void copy(viewedReport.content, 'Report copied.')}><Copy size={16} /></button>
                                            <button className="th-icon-button" aria-label="Download report" onClick={() => { const url = URL.createObjectURL(new Blob([viewedReport.content], { type: 'text/markdown' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${viewedReport.title.replace(/[^\w-]+/g, '-').slice(0, 60) || 'team-report'}.md`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}><Download size={16} /></button>
                                        </header>
                                        <MarkdownRenderer content={viewedReport.content} />
                                    </article>}
                                </div>}
                        </>}
                    </>}
                </>}
            </>}

        {modal && <TeamDialog title={{ team: 'Create a team', join: 'Join a team', project: 'New shared project', duty: 'Add a duty', invite: 'Invite people', report: 'Share a report', rename: 'Rename team' }[modal]} close={() => setModal(null)} busy={busy}>
            <form className="team-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
                {modal === 'invite' && <div className="th-invite-box is-dialog"><span><Link2 size={15} />Share this link</span><code>{inviteLink}</code><button type="button" onClick={() => void copy(inviteLink, 'Invite link copied.')}><Copy size={14} />Copy</button></div>}
                <p className="team-muted">{{
                    team: 'Teams are private. Only people you invite or share the link with can join.',
                    join: 'Paste the invite link a teammate sent you, or type the team ID.',
                    project: 'Everyone on the team can open and edit this project.',
                    duty: 'Duties belong to one person and one day.',
                    invite: 'Or send an invitation to someone who already has a Stratabin account. They accept it from their Teams tab.',
                    report: 'The report is saved inside the selected project for the whole team to read.',
                    rename: 'Everyone on the team will see the new name.',
                }[modal]}</p>
                <label>{{ team: 'Team name', join: 'Invite link or team ID', project: 'Project name', duty: 'What needs to be done?', invite: 'Username or email', report: 'Report title', rename: 'Team name' }[modal]}
                    <input autoFocus required maxLength={modal === 'duty' ? 2000 : modal === 'team' || modal === 'rename' ? 100 : 160} placeholder={modal === 'join' ? 'https://…/join/42' : modal === 'invite' ? 'maya or maya@example.com' : undefined} value={title} onChange={event => setTitle(event.target.value)} /></label>
                {modal === 'project' && <>
                    <label>Type<select value={projectType} onChange={event => setProjectType(event.target.value as typeof projectType)}><option value="strategy">Plan (writing, board, tasks)</option><option value="notes">Notes</option></select></label>
                    <label>Description <span className="th-optional">optional</span><textarea value={body} maxLength={2000} rows={3} onChange={event => setBody(event.target.value)} /></label>
                </>}
                {(modal === 'duty' || modal === 'project') && <label>{modal === 'project' ? 'Owner' : 'Who does it?'}<select value={assignee} onChange={event => setAssignee(event.target.value)}>
                    {modal === 'project' && <option value="">No owner yet</option>}
                    {members.filter(member => admin || modal === 'project' || member.id === me).map(member => <option key={member.id} value={member.id}>{member.id === me ? `${nameOf(member)} (you)` : nameOf(member)}</option>)}
                </select></label>}
                {modal === 'duty' && <label>Day<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>}
                {modal === 'report' && <>
                    <label>Project<select value={reportProjectId || ''} onChange={event => setReportProjectId(Number(event.target.value))}>{allProjects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
                    <label>Report<textarea required rows={10} maxLength={40000} value={body} onChange={event => setBody(event.target.value)} placeholder="Write an update or paste an answer from your AI. Markdown works." /></label>
                    <span className="team-muted">{body.length.toLocaleString()} / 40,000 characters</span>
                    <input hidden ref={importInput} type="file" accept=".txt,.md,.markdown" onChange={async event => {
                        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
                        try { if (file.size > 160000) throw new Error('Choose a text file of up to 40,000 characters.'); const content = await file.text(); if (content.length > 40000) throw new Error('This file is longer than 40,000 characters.'); setBody(content); if (!title) setTitle(file.name.replace(/\.[^.]+$/, '')); }
                        catch (error) { setNotice(error instanceof Error ? error.message : 'Could not read the file.'); }
                    }} />
                    <button type="button" onClick={() => importInput.current?.click()}><Upload size={16} />Import a text or Markdown file</button>
                </>}
                {notice && <p className="team-feedback error" role="alert">{notice}</p>}
                <footer><button type="button" disabled={busy} onClick={() => setModal(null)}>Cancel</button>
                    <button className="team-primary" disabled={busy || !title.trim() || (modal === 'report' && !body.trim())}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{{ team: 'Create team', join: 'Join team', project: 'Create project', duty: 'Add duty', invite: 'Send invitation', report: 'Publish report', rename: 'Save name' }[modal]}</button></footer>
            </form>
        </TeamDialog>}

        {confirm && <TeamDialog title={confirm.title} close={() => setConfirm(null)} busy={busy}>
            <div className="team-form"><p className="team-muted">{confirm.body}</p>{notice && <p className="team-feedback error" role="alert">{notice}</p>}
                <footer><button type="button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="th-danger" disabled={busy} onClick={() => void runConfirm()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}{confirm.action}</button></footer>
            </div>
        </TeamDialog>}
    </div>;
}
