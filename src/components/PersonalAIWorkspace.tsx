import { currentAccount } from '../lib/accountStorage';
import { useTimetables } from '../store/useTimetables';
import LavenderDotBackground from './LavenderDotBackground';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Download, FileText, Upload, Archive, RotateCcw, Maximize2, Minimize2, X, Folder, ChevronDown, Search, ArrowLeft, Activity, Sparkles, Loader2, Images, ScanText, ChevronLeft } from 'lucide-react';
import { prepareShot, shotPayload, extractTextOnDevice, reportImageBytes, MAX_SHOTS, SHOT_WORKSPACE_BUDGET, type ReportShot } from '../lib/reportScreenshots';
import { API_BASE_URL } from '../constants';
import useStore from '../store/useStore';
import { isListedProject } from '../lib/projectVisibility';
import MarkdownRenderer from './MarkdownRenderer';
import { buildProjectAiPackage, DEFAULT_SECTIONS, REPORT_CONTENT_LIMIT, REPORT_LIMIT, type PackageSections, type ReportProvider, type ExternalAiReport } from '../lib/projectAiPackage';
import './PersonalAIWorkspace.css';
import { useAuth } from '@clerk/clerk-react';
import { buildProjectCapsule } from '../lib/projectCapsule';
import { applyReportUndo, type ReportUndo } from '../lib/reportUndo';

const PROVIDERS = [
    { id: 'chatgpt', name: 'ChatGPT', logo: '/brands/chatgpt.jpg', url: 'https://chatgpt.com/' },
    { id: 'claude', name: 'Claude', logo: '/brands/claude.jpg', url: 'https://claude.ai/' },
    { id: 'gemini', name: 'Gemini', logo: '/brands/gemini.png', url: 'https://gemini.google.com/' },
] as const;
const SECTIONS: Array<{ id: keyof PackageSections; label: string; hint: string }> = [
    { id: 'writing', label: 'Writing', hint: 'Your project document' },
    { id: 'board', label: 'Flow board', hint: 'Idea text and connections' },
    { id: 'tasks', label: 'Tasks', hint: 'Task text and completion' },
    { id: 'timeline', label: 'Timeline', hint: 'Phases and planning notes' },
    { id: 'goals', label: 'Goals', hint: 'Targets and progress' },
    { id: 'code', label: 'Code files', hint: 'Optional · full file contents' },
];
// Generated inside Stratabin with the managed model; uses the daily Sasha allowance.
const IN_APP = { id: 'stratabin', name: 'Stratabin AI' } as const;
const REPORT_CONTEXT_LIMIT = 120000;
const providerLabel = (provider: string) => provider === 'stratabin' ? IN_APP.name : PROVIDERS.find(item => item.id === provider)?.name || 'Other';
type AiStatus = { pro: boolean; configured: boolean; remaining?: number; limit: number };
const EMPTY_REPORTS: ExternalAiReport[] = [];
function download(text: string, filename: string) { const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

function Workspace() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const availableProjects = useStore(state => state.canvases);
    const [params] = useSearchParams();
    const { userId, getToken } = useAuth();
    const draftKey = `stratabin:ai-draft:${userId || 'guest'}:${id}`;
    const [draft] = useState(() => { try { return JSON.parse(sessionStorage.getItem(`${currentAccount()}:${draftKey}`) || '{}') || {}; } catch { return {}; } });
    const project = useStore(state => state.canvases[id]);
    const reports = project?.externalAiReports || EMPTY_REPORTS;
    const [provider, setProvider] = useState<ReportProvider>(['chatgpt', 'claude', 'gemini', 'stratabin', 'other'].includes(draft.provider) ? draft.provider : 'chatgpt');
    const calendars = useStore(state => state.projectCalendarEvents);
    const pins = useStore(state => state.writingPinnedCalendarEventKeys);
    const timelines = useStore(state => state.timelines);
    const diagrams = useStore(state => state.diagrams);
    const logs = useStore(state => state.dailyExecutionLogs);
    const [fullCapsule, setFullCapsule] = useState(true);
    const [sections, setSections] = useState<PackageSections>({ ...DEFAULT_SECTIONS });
    const [instruction, setInstruction] = useState(() => params.get('prompt') || (typeof draft.instruction === 'string' ? draft.instruction : '') || 'Analyze this project. Summarize the current plan, identify gaps and risks, and suggest the next five actions.');
    const [tab, setTab] = useState<'prepare' | 'reports'>(params.get('tab') === 'reports' ? 'reports' : 'prepare');
    const [preview, setPreview] = useState(false);
    const [focusEditor, setFocusEditor] = useState(false);
    const requestEditor = useRef<HTMLTextAreaElement>(null);
    const [message, setMessage] = useState('');
    const [copyPulse, setCopyPulse] = useState<number | null>(null);
    const copySequence = useRef(0);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
    const [reportTitle, setReportTitle] = useState(typeof draft.reportTitle === 'string' ? draft.reportTitle.slice(0, 160) : '');
    const [reportContent, setReportContent] = useState(typeof draft.reportContent === 'string' ? draft.reportContent.slice(0, REPORT_CONTENT_LIMIT) : '');
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [editingReport, setEditingReport] = useState<string | null>(typeof draft.editingReport === 'string' ? draft.editingReport : null);
    const [showArchived, setShowArchived] = useState(false);
    const [undoSave, setUndoSave] = useState<ReportUndo | null>(null);
    const [projectMenuOpen, setProjectMenuOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedTitle, setGeneratedTitle] = useState('');
    const [shots, setShots] = useState<ReportShot[]>([]);
    const [keepShots, setKeepShots] = useState(true);
    const [shotBusy, setShotBusy] = useState<null | 'loading' | 'ai' | 'ocr'>(null);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [zoomShot, setZoomShot] = useState<string | null>(null);
    const shotInput = useRef<HTMLInputElement>(null);
    const [composerMode, setComposerMode] = useState<'generate' | 'screenshot' | 'paste'>(typeof draft.reportContent === 'string' && draft.reportContent.trim() ? 'paste' : 'generate');
    const inApp = provider === 'stratabin';
    useEffect(() => {
        if (!userId) return;
        let live = true;
        getToken().then(token => fetch(`${API_BASE_URL}/api/assistant/status`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }))
            .then(response => response.ok ? response.json() : null)
            .then(data => { if (live && data) setAiStatus({ pro: data.pro === true, configured: data.configured === true, remaining: typeof data.remaining?.chat === 'number' ? data.remaining.chat : undefined, limit: Number(data.limits?.chat) || 10 }); })
            .catch(() => { /* The panel keeps showing that the allowance is being checked. */ });
        return () => { live = false; };
    }, [userId, getToken]);

    useEffect(() => { document.title = `Use my AI — ${project?.name || 'Project'} | Stratabin`; }, [project?.name]);
    useEffect(() => { try { sessionStorage.setItem(`${currentAccount()}:${draftKey}`,  JSON.stringify({ provider, instruction, reportTitle, reportContent, editingReport })); } catch { /* The editor remains usable when storage is unavailable. */ } }, [draftKey, provider, instruction, reportTitle, reportContent, editingReport]);

    useEffect(() => {
        const handlePointer = (event: PointerEvent) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
                setProjectMenuOpen(false);
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setProjectMenuOpen(false);
        };
        document.addEventListener('pointerdown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('pointerdown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    // Keep the open project selectable even while it is still an empty placeholder.
    const projectList = useMemo(() => Object.values(availableProjects).filter(item => item.id === id || isListedProject(item)).map(item => ({
        id: item.id,
        name: item.name || item.title || 'Untitled project',
    })), [availableProjects, id]);

    const filteredProjects = useMemo(() => projectList.filter(p =>
        p.name.toLowerCase().includes(projectSearch.trim().toLowerCase())
    ), [projectList, projectSearch]);

    const activeProjectName = projectList.find(p => p.id === id)?.name || project?.name || project?.title || 'Choose project…';

    const fileInput = useRef<HTMLInputElement>(null);
    const timetables = useTimetables(state => state.tables);
    const packageText = useMemo(() => fullCapsule && project ? buildProjectCapsule(project, { projectCalendarEvents: calendars, writingPinnedCalendarEventKeys: pins, timelines, diagrams, dailyExecutionLogs: logs, timetables }, instruction) : buildProjectAiPackage(project || {}, sections, instruction), [project, sections, instruction, fullCapsule, calendars, pins, timelines, diagrams, logs, timetables]);
    const hasSections = Boolean(project) && (fullCapsule || Object.values(sections).some(Boolean));
    const fileName = `${(project?.name || 'project').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 70)}-ai-${fullCapsule ? "capsule" : "context"}.txt`;
    const currentReport = reports.find(report => report.id === selectedReport && (showArchived || !report.archived));
    const selectedProvider = PROVIDERS.find(item => item.id === provider) || PROVIDERS[0];
    const updateReports = (next: ExternalAiReport[]) => {
        try { useStore.setState(state => {
            const canvas = state.canvases[id]; if (!canvas) return state;
            return { canvases: { ...state.canvases, [id]: { ...canvas, externalAiReports: next, updatedAt: Date.now() } } };
        }); return true; } catch { setMessage('Browser storage could not save this change. Keep this page open and download your report before leaving.'); return false; }
    };
    const saveReport = (contentOverride?: string, withImages = false) => {
        const content = (contentOverride ?? reportContent).trim();
        const images = keepShots || withImages ? shots.map(shot => shot.stored).filter(Boolean) : [];
        if (!content && !images.length) { if (shots.length) setMessage('These screenshots are too large to keep. Extract their text instead.'); return; }
        if (images.length && reportImageBytes(useStore.getState().canvases, editingReport) + images.join('').length > SHOT_WORKSPACE_BUDGET) { setMessage('Report screenshots have reached their storage limit (about 3 MB across your projects). Extract the text and untick Keep screenshots, or remove screenshots from older reports.'); return; }
        const current = useStore.getState().canvases[id]; if (!current) { setMessage('This project is unavailable. Reopen it from Projects.'); return; }
        const existing = current.externalAiReports || [];
        if (!editingReport && existing.length >= REPORT_LIMIT) { setMessage('This project has 30 saved reports. Edit an existing report or download this response to keep a copy.'); return; }
        if (editingReport && !existing.some(item => item.id === editingReport)) { setMessage('This report is no longer available. Cancel editing to save your response as a new report.'); return; }
        const now = Date.now();
        const report: ExternalAiReport = { id: editingReport || crypto.randomUUID(), title: reportTitle.trim() || `${provider === 'other' ? 'AI' : providerLabel(provider)} report`, content, ...(images.length ? { images } : {}), provider, createdAt: existing.find(item => item.id === editingReport)?.createdAt || now, updatedAt: now, archived: existing.find(item => item.id === editingReport)?.archived || false };
        const next = editingReport ? existing.map(item => item.id === editingReport ? report : item) : [...existing, report];
        if (!updateReports(next)) return;
        setUndoSave({ before: existing.find(item => item.id === report.id) || null, after: report, undone: false });
        setSelectedReport(report.id); setEditingReport(null); setReportTitle(''); setReportContent(''); setShots([]); setKeepShots(true); setMessage(/^proj_\d+$/.test(id) ? 'Report saved in this browser. Team report sync requires the updated workspace server.' : 'Report saved to this project in this browser.');
    };
    const contextTooLarge = packageText.length > REPORT_CONTEXT_LIMIT;
    const canGenerate = Boolean(userId) && hasSections && !generating && !contextTooLarge && Boolean(aiStatus) && aiStatus!.configured && aiStatus!.remaining !== 0;
    const generateHere = async () => {
        if (!canGenerate || !project) return;
        if ((useStore.getState().canvases[id]?.externalAiReports || []).length >= REPORT_LIMIT) { setMessage('This project has 30 saved reports. Edit an older report instead, or download and remove one before generating a new one.'); return; }
        const title = (generatedTitle.trim() || `${project.name || 'Project'} report`).slice(0, 160);
        setGenerating(true); setMessage(''); setUndoSave(null);
        try {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/assistant/report`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000), body: JSON.stringify({ instruction: instruction.trim() || 'Analyze this project. Summarize the current plan, identify gaps and risks, and suggest the next five actions.', context: packageText }) });
            const data = await response.json().catch(() => ({}));
            const remaining = typeof data.remaining === 'number' ? data.remaining : response.status === 429 ? 0 : undefined;
            if (remaining !== undefined) setAiStatus(previous => previous ? { ...previous, remaining } : previous);
            if (!response.ok || typeof data.content !== 'string' || !data.content.trim()) { setMessage(typeof data.error === 'string' ? data.error : 'The report could not be generated. Please try again.'); return; }
            const content = data.content.slice(0, REPORT_CONTENT_LIMIT);
            const latest = useStore.getState().canvases[id]?.externalAiReports || [];
            const now = Date.now();
            const report: ExternalAiReport = { id: crypto.randomUUID(), title, content, provider: 'stratabin', createdAt: now, updatedAt: now, archived: false };
            if (latest.length >= REPORT_LIMIT || !updateReports([...latest, report])) {
                // Keep the result the user spent a request on: leave it in the editor to download or save later.
                setEditingReport(null); setComposerMode('paste'); setProvider('stratabin'); setReportTitle(title); setReportContent(content); setTab('reports');
                setMessage('The report was generated but could not be saved to this project. It is in the editor below; download it to keep a copy.');
                return;
            }
            setUndoSave({ before: null, after: report, undone: false });
            setSelectedReport(report.id); setShowArchived(false); setGeneratedTitle(''); setTab('reports');
            setMessage(`Report generated and saved to this project.${remaining !== undefined ? ` ${remaining} Sasha ${remaining === 1 ? 'request' : 'requests'} left today.` : ''}`);
        } catch { setMessage('Could not reach Stratabin. Check your connection and try again.'); }
        finally { setGenerating(false); }
    };
    const generateHint = !userId ? 'Sign in to generate reports here.'
        : !project ? 'Open an available project to generate a report.'
        : !hasSections ? 'Select at least one section under Project context.'
        : contextTooLarge ? 'This project is too large for one report. Turn off Full project capsule and leave out code files, then try again.'
        : !aiStatus ? 'Checking your Sasha allowance…'
        : !aiStatus.configured ? 'In-app reports are not available on the server yet.'
        : !aiStatus.pro && aiStatus.remaining === 0 ? 'You have used your free Sasha credits. Upgrade to Pro for daily in-app reports.'
        : aiStatus.remaining === 0 ? 'Your daily Sasha allowance is used. It resets at midnight UTC.'
        : !aiStatus.pro ? `Free trial: each report uses 1 Sasha credit${aiStatus.remaining !== undefined ? ` · ${aiStatus.remaining} of ${aiStatus.limit} left` : ''}. Pro gives you daily reports.`
        : `Each report uses 1 Sasha request${aiStatus.remaining !== undefined ? ` · ${aiStatus.remaining} of ${aiStatus.limit} left today` : ''}.`;
    const generateButton = <button className="ai-primary-action ai-generate-action" disabled={!canGenerate} aria-busy={generating} onClick={() => void generateHere()}>{generating ? <Loader2 size={15} className="ai-spin" /> : <Sparkles size={15} />}{generating ? 'Writing your report…' : 'Generate report'}</button>;
    const addShots = async (files: FileList | File[]) => {
        const list = Array.from(files);
        if (!list.length) return;
        const room = MAX_SHOTS - shots.length;
        if (room <= 0) { setMessage(`A report can have up to ${MAX_SHOTS} screenshots. Remove one to add another.`); return; }
        setShotBusy('loading'); setMessage('');
        const added: ReportShot[] = []; const problems: string[] = [];
        for (const file of list.slice(0, room)) { try { added.push(await prepareShot(file)); } catch (error) { problems.push(error instanceof Error ? error.message : `${file.name}: could not be added.`); } }
        if (list.length > room) problems.push(`Only the first ${room} screenshot${room === 1 ? '' : 's'} were added (up to ${MAX_SHOTS} per report).`);
        setShots(previous => [...previous, ...added].slice(0, MAX_SHOTS));
        if (added.length && !reportTitle.trim()) setReportTitle(added[0].name.replace(/\.[^.]+$/, '').slice(0, 160));
        setShotBusy(null);
        if (problems.length) setMessage(problems.join(' '));
    };
    const moveShot = (index: number) => setShots(previous => { if (index < 1) return previous; const next = previous.slice(); [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; });
    const extracted = (text: string, title?: string) => {
        setReportContent(text.slice(0, REPORT_CONTENT_LIMIT));
        if (title && (!reportTitle.trim() || /^(Screenshot|Screen Shot|IMG_|image|WhatsApp)/i.test(reportTitle))) setReportTitle(title.slice(0, 160));
        setKeepShots(true); setComposerMode('paste');
    };
    const canExtractAi = Boolean(userId) && shots.length > 0 && !shotBusy && Boolean(aiStatus) && aiStatus!.configured && aiStatus!.remaining !== 0;
    const extractWithAi = async () => {
        if (!canExtractAi) return;
        setShotBusy('ai'); setMessage('');
        try {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/assistant/report/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000), body: JSON.stringify({ images: shots.map(shotPayload) }) });
            const data = await response.json().catch(() => ({}));
            const remaining = typeof data.remaining === 'number' ? data.remaining : response.status === 429 ? 0 : undefined;
            if (remaining !== undefined) setAiStatus(previous => previous ? { ...previous, remaining } : previous);
            if (!response.ok || typeof data.content !== 'string' || !data.content.trim()) { setMessage(typeof data.error === 'string' ? data.error : 'The screenshots could not be read. Try again, or extract without AI.'); return; }
            extracted(data.content, typeof data.title === 'string' ? data.title : undefined);
            setMessage(`Report extracted with Stratabin AI. Review it, then choose Save report.${remaining !== undefined ? ` ${remaining} Sasha ${remaining === 1 ? 'request' : 'requests'} left today.` : ''}`);
        } catch { setMessage('Could not reach Stratabin. Check your connection, or extract without AI.'); }
        finally { setShotBusy(null); }
    };
    const extractWithoutAi = async () => {
        if (!shots.length || shotBusy) return;
        setShotBusy('ocr'); setOcrProgress(0); setMessage('');
        try {
            const text = await extractTextOnDevice(shots, value => setOcrProgress(value));
            if (!text.trim()) { setMessage('No text was found in these screenshots. Try clearer screenshots, or save them as images.'); return; }
            extracted(text);
            setMessage('Text extracted on this device. Check headings, lists and tables, then choose Save report.');
        } catch { setMessage('Text could not be read on this device. Check your connection (the reader downloads once), or save the screenshots as images.'); }
        finally { setShotBusy(null); }
    };
    const shotStrip = (editable: boolean) => <ol className="ai-shot-list" aria-label="Screenshots in order">{shots.map((shot, index) => <li key={shot.id}><button type="button" className="ai-shot-thumb" onClick={() => setZoomShot(shot.stored || shot.read)} aria-label={`View screenshot ${index + 1}`}><img src={shot.stored || shot.read} alt="" /></button><span className="ai-shot-index">{index + 1}</span>{editable && <span className="ai-shot-tools">{index > 0 && <button type="button" aria-label={`Move screenshot ${index + 1} earlier`} onClick={() => moveShot(index)}><ChevronLeft size={14} /></button>}<button type="button" aria-label={`Remove screenshot ${index + 1}`} onClick={() => setShots(previous => previous.filter(item => item.id !== shot.id))}><X size={14} /></button></span>}</li>)}</ol>;
    const generateControls = <><label htmlFor={`inapp-title-${tab}`}>Report title</label><input id={`inapp-title-${tab}`} className="ai-inapp-input" value={generatedTitle} onChange={event => setGeneratedTitle(event.target.value)} maxLength={160} placeholder={`${project?.name || 'Project'} report`} />{aiStatus?.pro && aiStatus.remaining !== undefined && <div className="ai-credit-meter" role="img" aria-label={`${aiStatus.remaining} of ${aiStatus.limit} Sasha requests left today`}><span style={{ width: `${Math.min(100, (aiStatus.remaining / aiStatus.limit) * 100)}%` }} /></div>}{generateButton}<p className="ai-field-help">{generateHint}{aiStatus && !aiStatus.pro && <> <Link to="/billing">See Pro</Link></>}</p></>;
    const copy = async () => { try { await navigator.clipboard.writeText(packageText); if (fullCapsule) { if (copyTimer.current) clearTimeout(copyTimer.current); setCopyPulse(++copySequence.current); copyTimer.current = setTimeout(() => setCopyPulse(null), 3200); } setMessage('Project context copied. Paste it into your AI and send it there. Pasting may appear as text; use Download for a file attachment.'); } catch { setPreview(true); setMessage('Clipboard access is unavailable. Select the preview text to copy it, or download the attachment.'); } };

    return <main className={`personal-ai theme-page${focusEditor ? ' ai-focus-mode' : ''}`} onKeyDown={event => { if (event.key === 'Escape' && focusEditor) setFocusEditor(false); }}>
        <LavenderDotBackground />
        {copyPulse !== null && <aside key={copyPulse} className="ai-capsule-pop" role="status" aria-live="polite"><button className="ai-capsule-pop-close" aria-label="Dismiss capsule confirmation" onClick={() => { if (copyTimer.current) clearTimeout(copyTimer.current); setCopyPulse(null); }}><X size={16} /></button><div className="ai-capsule-art" aria-hidden="true"><span className="ai-capsule-orbit" /><span className="ai-capsule-pill"><span /><span /></span><span className="ai-capsule-check"><Check size={18} strokeWidth={3} /></span></div><strong>Capsule copied</strong><p>Your project is ready to paste into {selectedProvider.name}.</p></aside>}
        {zoomShot && <div className="ai-shot-zoom" role="dialog" aria-modal="true" aria-label="Screenshot" onClick={() => setZoomShot(null)} onKeyDown={event => { if (event.key === 'Escape') setZoomShot(null); }}><button type="button" aria-label="Close screenshot" autoFocus onClick={() => setZoomShot(null)}><X size={20} /></button><img src={zoomShot} alt="Report screenshot" onClick={event => event.stopPropagation()} /></div>}
        <div className="personal-ai-inner">
            <div className="ai-workspace-projectbar">
                <div className="ai-workspace-projectbar-nav">
                    <button type="button" className="ai-back-btn" onClick={() => navigate('/ai')}>
                        <ArrowLeft size={16} />
                        <span>All projects</span>
                    </button>
                    <button type="button" className="ai-nav-pill" onClick={() => navigate('/dashboard?tab=monitor')} title="Open project execution monitor">
                        <Activity size={14} />
                        <span>Monitor</span>
                    </button>
                </div>

                <div className="ai-project-selector" ref={projectDropdownRef}>
                    <span className="ai-project-selector-label">Working on</span>
                    <button
                        type="button"
                        id="ai-project-select"
                        className="ai-project-selector-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={projectMenuOpen}
                        onClick={() => { setProjectMenuOpen(prev => !prev); setProjectSearch(''); }}
                    >
                        <Folder size={15} className="ai-project-selector-icon" />
                        <span className="ai-project-selector-title">{activeProjectName}</span>
                        <ChevronDown size={14} className={`ai-project-selector-chevron ${projectMenuOpen ? 'open' : ''}`} />
                    </button>

                    {projectMenuOpen && (
                        <div className="ai-project-selector-dropdown" role="listbox">
                            <div className="ai-project-selector-search">
                                <Search size={14} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search projects…"
                                    value={projectSearch}
                                    onChange={e => setProjectSearch(e.target.value)}
                                />
                            </div>
                            <div className="ai-project-selector-items custom-scrollbar">
                                {filteredProjects.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="option"
                                        aria-selected={item.id === id}
                                        className={`ai-project-selector-item ${item.id === id ? 'selected' : ''}`}
                                        onClick={() => {
                                            setProjectMenuOpen(false);
                                            if (item.id !== id) navigate(`/ai/${item.id}`);
                                        }}
                                    >
                                        <Folder size={14} />
                                        <span>{item.name}</span>
                                        {item.id === id && <Check size={14} className="ai-project-selector-check" />}
                                    </button>
                                ))}
                                {!filteredProjects.length && (
                                    <p className="ai-project-selector-empty">No projects match</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <header className="personal-ai-heading"><div><span className="ai-eyebrow">AI WORKSPACE</span><h1>Work with your AI.</h1><p>Generate a report here with Stratabin AI, or bring your project to your own AI and keep the useful ideas here.</p></div></header>
            <nav className="ai-workspace-tabs" aria-label="AI workspace"><button aria-current={tab === 'prepare' ? 'page' : undefined} onClick={() => { setTab('prepare'); if (provider === 'other') setProvider('chatgpt'); setMessage(''); }}>Prepare context</button><button aria-current={tab === 'reports' ? 'page' : undefined} onClick={() => { setTab('reports'); setMessage(''); }}>Saved reports <span>{reports.filter(report => !report.archived).length}</span></button></nav>
            {message && <div className="ai-notice" role="status"><span>{message}</span>{undoSave && tab === 'reports' && <button onClick={() => { const next = applyReportUndo(useStore.getState().canvases[id]?.externalAiReports || [], undoSave); if (!next) { setMessage('This report changed since the save. Undo is unavailable to protect the newer changes.'); setUndoSave(null); return; } if (updateReports(next)) { setUndoSave({ ...undoSave, undone: !undoSave.undone }); setSelectedReport(null); setMessage(undoSave.undone ? 'Report save restored.' : 'Report save undone.'); } }}>{undoSave.undone ? 'Redo save' : 'Undo save'}</button>}</div>}
            {tab === 'prepare' ? <>
                <div className="ai-provider-grid" role="radiogroup" aria-label="Choose your AI">{[...PROVIDERS, IN_APP].map((item, index, options) => <button key={item.id} role="radio" aria-checked={provider === item.id} tabIndex={provider === item.id ? 0 : -1} data-provider={item.id} onKeyDown={event => { const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0; if (step || event.key === 'Home' || event.key === 'End') { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + step + options.length) % options.length; setProvider(options[next].id); (event.currentTarget.parentElement?.querySelector(`[data-provider="${options[next].id}"]`) as HTMLButtonElement | null)?.focus(); } }} onClick={() => setProvider(item.id)}>{'logo' in item ? <span className={`provider-logo provider-${item.id}`}><img src={item.logo} alt="" width="40" height="40" /></span> : <span className="provider-logo provider-stratabin" aria-hidden="true"><Sparkles size={20} /></span>}<span><strong>{item.name}</strong><small>{'logo' in item ? (provider === item.id ? "Selected" : "Use your account") : "Generate here · uses Sasha credits"}</small></span>{provider === item.id && <Check size={17} />}</button>)}</div>
                <div className="ai-prepare-grid"><section className="ai-context-panel"><div className="ai-editor-title"><h2>What are we working through?</h2><button aria-pressed={focusEditor} onClick={() => { setFocusEditor(!focusEditor); requestAnimationFrame(() => requestEditor.current?.focus()); }}>{focusEditor ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{focusEditor ? 'Exit focus' : 'Focus editor'}</button></div><p>{inApp ? 'Write what the report should cover. Stratabin AI reads your project and saves the report here.' : <>Write the instructions to include with your project. Then copy the brief and paste it into {selectedProvider.name}.</>}</p><div className="ai-capsule-options"><label><input type="checkbox" checked={fullCapsule} onChange={event => setFullCapsule(event.target.checked)} />Full project capsule</label><p>{fullCapsule ? "Includes your request, writing, every code file, flow connections and object details, project calendar, tasks, linked timelines, goals, comments, saved reports, and execution notes stored here. Original images and documents must be attached separately." : "Choose which sections to share below."}</p>{!project && <p role="alert">This project is unavailable in this browser. Open an existing project from Projects to export its context.</p>}</div>{!fullCapsule && <details className="ai-context-options"><summary><span>Project context</span><strong>{Object.values(sections).filter(Boolean).length} sections selected</strong></summary><p id="ai-context-help">Only checked sections are included in this selected brief. Images, attachments, and chat history stay out.</p><div className="ai-section-grid">{SECTIONS.map(item => <label key={item.id}><input type="checkbox" checked={sections[item.id]} onChange={event => setSections(previous => ({ ...previous, [item.id]: event.target.checked }))} /><span>{item.label}<small>{item.hint}</small></span></label>)}</div></details>}<label className="ai-instruction-label" htmlFor="ai-instruction">What would you like help with?</label><textarea ref={requestEditor} id="ai-instruction" aria-describedby="ai-request-help" value={instruction} onChange={event => setInstruction(event.target.value)} maxLength={5000} rows={10} /><p id="ai-request-help" className="ai-field-help">{hasSections ? (focusEditor ? "Press Escape to return to the full workspace." : inApp ? "This is the request for your report. It is sent with your project when you generate." : "This is a brief editor, not a live chat. Your request is included when you copy or download the project.") : (project ? "Select at least one section under Project context to enable download and copy." : "Open an available project to copy or download its context.")}</p><div className="ai-prompt-chips">{['Brainstorm new ideas and connections.', 'Review progress and identify risks.', 'Create a prioritized action plan.'].map(prompt => <button key={prompt} aria-pressed={instruction === prompt} onClick={() => { setInstruction(prompt); requestEditor.current?.focus(); }}>{prompt}</button>)}</div><div className="ai-request-next">{inApp ? <><div className="ai-action-row">{generateButton}<button aria-expanded={preview} onClick={() => setPreview(!preview)}><FileText size={15} />Preview brief</button></div><p>{generateHint}</p></> : <><div className="ai-action-row"><button className="ai-primary-action" disabled={!hasSections} onClick={() => void copy()}><Copy size={15} />{fullCapsule ? "Copy capsule" : "Copy request + project"}</button><a href={selectedProvider.url} target="_blank" rel="noopener noreferrer">Open {selectedProvider.name}<ArrowUpRight size={16} /></a><button aria-expanded={preview} onClick={() => { setPreview(!preview); setFocusEditor(false); requestAnimationFrame(() => document.querySelector(".ai-package-preview")?.scrollIntoView({ block: "nearest" })); }}><FileText size={15} />Preview brief</button></div><p>Paste the copied brief into your AI and send it there to get a response. Nothing is sent automatically.</p></>}</div></section>
                {inApp ? <section className="ai-handoff-panel ai-inapp-panel"><h2>Generate it in Stratabin</h2><p>Stratabin AI reads {fullCapsule ? 'your full project capsule' : 'the sections you selected'} and your request, writes a report, and saves it to this project’s Saved reports.</p>{generateControls}<div className="ai-handoff-note">Your request and project context are sent to Google Gemini through Stratabin to write the report. Review it before relying on it.</div></section> : <section className="ai-handoff-panel"><h2>Take it to {selectedProvider.name}</h2><p>{fullCapsule ? "Your full capsule includes code and all stored project sections. Review it before sharing." : "Your selected brief stays here until you copy or download it."}</p><ol><li><strong>Get your project attachment</strong><p>Download a text file to attach, or copy the same context to paste. Pasting does not guarantee a file attachment.</p><div className="ai-action-row"><button className="ai-primary-action" disabled={!hasSections} onClick={() => { download(packageText, fileName); setMessage('Context file downloaded. Open your AI and attach the file using its upload button.'); }}><Download size={15} />{fullCapsule ? "Download capsule file" : "Download project"}</button><button disabled={!hasSections} onClick={() => void copy()}><Copy size={15} />Copy</button></div></li><li><strong>Attach it in {selectedProvider.name}</strong><p>Sign in there, start a chat, and attach the downloaded file or paste the context.</p><a href={selectedProvider.url} target="_blank" rel="noopener noreferrer">Open {selectedProvider.name}<ArrowUpRight size={16} /></a></li><li><strong>Bring the response back</strong><p>Paste or import the response into Saved reports to keep it with this project.</p><button onClick={() => setTab('reports')}>Save an AI response<ArrowUpRight size={14} /></button></li></ol><div className="ai-handoff-note">The conversation takes place in {selectedProvider.name}. Opening it does not upload your project or connect your account automatically. Your provider’s plan and limits apply.</div></section>}</div>
                <section className="ai-package-preview"><button aria-expanded={preview} onClick={() => setPreview(!preview)}><FileText size={15} />{preview ? 'Hide' : 'Preview'} project attachment <span>{Math.ceil(new Blob([packageText]).size / 1024)} KB</span></button>{preview && <textarea aria-label="Project attachment preview" spellCheck={false} readOnly value={packageText} rows={16} />}</section>
                <details className="ai-connector-details"><summary>About live project connectors</summary><p>ChatGPT and Claude support connectors that can read authorized project context from a hosted service. Stratabin’s live connectors are not connected yet. This workspace currently uses manual attachments for all three providers.</p><div><a href="https://developers.openai.com/plugins/build/app-quickstart" target="_blank" rel="noopener noreferrer">ChatGPT connectors<ArrowUpRight size={13} /></a><a href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp" target="_blank" rel="noopener noreferrer">Claude connectors<ArrowUpRight size={13} /></a></div></details>
                
            </> : <div className="ai-reports-grid"><section className="ai-report-composer">{!editingReport && <div className="ai-composer-modes" role="tablist" aria-label="How to add a report"><button role="tab" aria-selected={composerMode === 'generate'} onClick={() => setComposerMode('generate')}><Sparkles size={15} />Generate</button><button role="tab" aria-selected={composerMode === 'screenshot'} onClick={() => { setComposerMode('screenshot'); if (provider === 'stratabin') setProvider('claude'); }}><Images size={15} />Screenshots</button><button role="tab" aria-selected={composerMode === 'paste'} onClick={() => setComposerMode('paste')}><Upload size={15} />Paste text</button></div>}{composerMode === 'generate' && !editingReport ? <div className="ai-inapp-panel ai-inapp-inline"><h2>Generate a report here</h2><p>Stratabin AI reads {fullCapsule ? 'your full project' : 'the sections you selected in Prepare context'}, writes the report, and saves it to this project. Each report uses 1 Sasha request.</p><label htmlFor="inapp-request">What should the report cover?</label><textarea id="inapp-request" value={instruction} onChange={event => setInstruction(event.target.value)} maxLength={5000} rows={5} /><div className="ai-prompt-chips">{['Summarize progress and identify risks.', 'Create a prioritized action plan.', 'Write a final project report.'].map(prompt => <button key={prompt} aria-pressed={instruction === prompt} onClick={() => setInstruction(prompt)}>{prompt}</button>)}</div>{generateControls}<div className="ai-handoff-note">Your request and project context are sent to Google Gemini through Stratabin to write the report. Review it before relying on it.</div></div> : composerMode === 'screenshot' && !editingReport ? <div className="ai-shot-panel"><h2>Add a report from screenshots</h2><p>Upload screenshots of a Claude, ChatGPT or Gemini chat in reading order. Keep them as images, or turn them into an editable report.</p><button type="button" className="ai-shot-drop" disabled={shotBusy === 'loading' || shots.length >= MAX_SHOTS} onClick={() => shotInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addShots(event.dataTransfer.files); }}>{shotBusy === 'loading' ? <Loader2 size={22} className="ai-spin" /> : <Images size={22} />}<strong>{shots.length ? 'Add more screenshots' : 'Choose screenshots'}</strong><small>or drop them here · PNG, JPEG or WebP · up to {MAX_SHOTS}</small></button><input ref={shotInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={event => { const files = event.target.files; if (files) void addShots(files); event.target.value = ''; }} />{shots.length > 0 && <>{shotStrip(true)}<label htmlFor="shot-provider">Screenshots from</label><select id="shot-provider" value={provider} onChange={event => setProvider(event.target.value as ReportProvider)}>{PROVIDERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="other">Other</option></select><label htmlFor="shot-title">Report title</label><input id="shot-title" className="ai-inapp-input" value={reportTitle} onChange={event => setReportTitle(event.target.value)} maxLength={160} placeholder="e.g. Launch plan review" /><div className="ai-shot-actions"><button type="button" className="ai-shot-action primary" disabled={!canExtractAi} aria-busy={shotBusy === 'ai'} onClick={() => void extractWithAi()}>{shotBusy === 'ai' ? <Loader2 size={18} className="ai-spin" /> : <Sparkles size={18} />}<span><strong>{shotBusy === 'ai' ? 'Reading screenshots…' : 'Extract with Stratabin AI'}</strong><small>Keeps headings, lists and tables · uses 1 Sasha request</small></span></button><button type="button" className="ai-shot-action" disabled={!!shotBusy} aria-busy={shotBusy === 'ocr'} onClick={() => void extractWithoutAi()}>{shotBusy === 'ocr' ? <Loader2 size={18} className="ai-spin" /> : <ScanText size={18} />}<span><strong>{shotBusy === 'ocr' ? `Reading text… ${Math.round(ocrProgress * 100)}%` : 'Extract without AI'}</strong><small>Free · runs on this device · plain text</small></span></button><button type="button" className="ai-shot-action" disabled={!!shotBusy} onClick={() => saveReport('', true)}><Images size={18} /><span><strong>Save as images</strong><small>Keep the screenshots as the report</small></span></button></div><p className="ai-field-help">{!aiStatus ? 'Checking your Sasha allowance…' : !aiStatus.configured ? 'Stratabin AI is not available on the server yet. Extract without AI is free.' : !aiStatus.pro && aiStatus.remaining === 0 ? <>You have used your free Sasha credits. <Link to="/billing">See Pro</Link> · Extract without AI is free.</> : !aiStatus.pro ? <>Free trial: Stratabin AI uses 1 Sasha credit{aiStatus.remaining !== undefined ? ` · ${aiStatus.remaining} of ${aiStatus.limit} left` : ''}. <Link to="/billing">See Pro</Link></> : aiStatus.remaining === 0 ? 'Your daily Sasha allowance is used. Extract without AI is still free.' : `Stratabin AI uses 1 Sasha request${aiStatus.remaining !== undefined ? ` · ${aiStatus.remaining} of ${aiStatus.limit} left today` : ''}. The first text extraction without AI downloads a reader (about 5 MB).`}</p></>}</div> : <><h2>{editingReport ? 'Edit your saved report' : 'Bring an AI response back'}</h2><p>Paste a response, or import a plain text or Markdown file. Saving keeps your writing and board unchanged.</p><label htmlFor="report-provider">AI used</label><select id="report-provider" value={provider} onChange={event => setProvider(event.target.value as ReportProvider)}>{PROVIDERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="stratabin">{IN_APP.name}</option><option value="other">Other</option></select><label htmlFor="report-title">Report title</label><input id="report-title" value={reportTitle} onChange={event => setReportTitle(event.target.value)} maxLength={160} placeholder="e.g. Product launch review" /><label htmlFor="report-content">AI response</label><textarea id="report-content" aria-describedby="report-count" value={reportContent} onChange={event => setReportContent(event.target.value)} rows={14} maxLength={REPORT_CONTENT_LIMIT} placeholder="Paste the response here…" /><span id="report-count" className="ai-character-count">{reportContent.length.toLocaleString()} / {REPORT_CONTENT_LIMIT.toLocaleString()}</span>{shots.length > 0 && <div className="ai-shot-attached"><label className="ai-shot-keep"><input type="checkbox" checked={keepShots} onChange={event => setKeepShots(event.target.checked)} />Keep {shots.length} screenshot{shots.length === 1 ? '' : 's'} with this report</label>{shotStrip(true)}</div>}<div className="ai-action-row"><button className="ai-primary-action" disabled={!reportContent.trim() && !(keepShots && shots.length)} onClick={() => saveReport()}><Check size={15} />{editingReport ? 'Save changes' : 'Save report'}</button><button onClick={() => fileInput.current?.click()}><Upload size={15} />Import file</button>{editingReport && <button onClick={() => { setEditingReport(null); setReportTitle(''); setReportContent(''); setShots([]); }}>Cancel edit</button>}</div><input ref={fileInput} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" hidden onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!/\.(txt|md|markdown)$/i.test(file.name)) { setMessage('Choose a .txt or .md file.'); return; } if (file.size > REPORT_CONTENT_LIMIT * 4) { setMessage('This file is too large. Import a report of up to 40,000 characters.'); return; } try { const text = await file.text(); if (text.length > REPORT_CONTENT_LIMIT) { setMessage('This report exceeds 40,000 characters. Shorten it before importing.'); return; } setReportContent(text); if (!reportTitle) setReportTitle(file.name.replace(/\.[^.]+$/, '')); setMessage('File imported. Review it, then choose Save report.'); } catch { setMessage('Could not read this file. Try pasting the response.'); } }} /></>}</section>
                <section className="ai-saved-reports"><div className="ai-report-list-heading"><h2>Project reports</h2><label><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />Show archived</label></div>{!reports.some(report => showArchived || !report.archived) && <div className="ai-reports-empty"><FileText size={24} /><h3>Your insights belong with your project.</h3><p>Reports you save will appear here.</p></div>}{reports.filter(report => showArchived || !report.archived).slice().reverse().map(report => <button className="ai-report-list-item" key={report.id} aria-pressed={selectedReport === report.id} onClick={() => setSelectedReport(report.id)}><FileText size={16} /><span>{report.title}<small>{providerLabel(report.provider)} · {new Date(report.createdAt).toLocaleDateString()}{report.archived ? ' · Archived' : ''}</small></span></button>)}{currentReport && <article className="ai-report-detail"><h3>{currentReport.title}</h3><div className="ai-action-row"><button onClick={() => download(currentReport.content, 'ai-report.md')}><Download size={14} />Download</button><button onClick={() => { setComposerMode('paste'); setShots((currentReport.images || []).map((src, index) => ({ id: `${currentReport.id}-${index}`, name: `Screenshot ${index + 1}`, stored: src, read: src }))); setKeepShots(true); setEditingReport(currentReport.id); setReportTitle(currentReport.title); setReportContent(currentReport.content); setProvider(currentReport.provider); }}>Edit</button><button onClick={() => { setUndoSave(null); const latest = useStore.getState().canvases[id]?.externalAiReports || []; updateReports(latest.map(report => report.id === currentReport.id ? { ...report, archived: !report.archived, updatedAt: Date.now() } : report)); }} >{currentReport.archived ? <RotateCcw size={14} /> : <Archive size={14} />}{currentReport.archived ? 'Restore' : 'Archive'}</button></div>{currentReport.images?.length ? <div className="ai-report-shots">{currentReport.images.map((src, index) => <button type="button" key={index} onClick={() => setZoomShot(src)} aria-label={`View screenshot ${index + 1}`}><img src={src} alt={`Screenshot ${index + 1} of the report`} loading="lazy" /></button>)}</div> : null}{currentReport.content.trim() && <MarkdownRenderer content={currentReport.content} />}</article>}</section></div>}
        </div>
    </main>;
}

export default function PersonalAIWorkspace() { const { id } = useParams(); const { userId } = useAuth(); const [params] = useSearchParams(); return <Workspace key={`${userId || 'guest'}:${id}:${params.get("prompt") || ""}:${params.get("tab") || ""}`} />; }
