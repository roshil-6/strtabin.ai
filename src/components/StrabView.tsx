import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { sendStrabMessageStreaming, type ChatMessage } from '../services/strabService';
import { serverWarmup } from '../services/serverWarmup';
import { workspaceService } from '../services/workspaceService';
import { getGuestAiRemaining, consumeGuestAiMessage, refundGuestAiMessage, getProAiRemaining, consumeProAiMessage, refundProAiMessage, PRO_AI_DAILY_LIMIT } from '../constants';
import { Network, Send, Sparkles, ArrowLeft, Trash2, Target, Plus } from 'lucide-react';
import MobileNav from './MobileNav';
import type { Node, Edge } from '@xyflow/react';

// ── Action executor for current canvas (update flow, create project in team workspace) ──
type StrabAction = {
    type: 'create_canvas' | 'add_node' | 'connect_nodes' | 'set_writing' | 'add_todo';
    name?: string; ref?: string; canvasRef?: string; nodeType?: string; label?: string; x?: number; y?: number;
    fromIndex?: number; toIndex?: number; content?: string; text?: string;
};
async function parseAndExecuteForCurrentCanvas(
    raw: string,
    canvasId: string,
    workspaceId: number | undefined,
    getCanvas: () => { nodes: Node[]; edges: Edge[] } | undefined,
    populateCanvas: (id: string, nodes: Node[], edges: Edge[]) => void,
    updateCanvasWriting: (id: string, content: string) => void,
    addCanvasTodo: (id: string, text: string) => void,
    ensureCanvasExists: (id: string) => void,
    createProjectInWorkspace: ((name: string, nodes: Node[], edges: Edge[], writing: string, todos: string[]) => Promise<string | null>) | null,
): Promise<{ cleanText: string; didUpdate: boolean }> {
    const actionMatch = raw.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
    const cleanText = actionMatch ? raw.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, '').trim() : raw;
    if (!actionMatch) return { cleanText: raw, didUpdate: false };

    let actions: StrabAction[] = [];
    try {
        const parsed = JSON.parse(actionMatch[1].trim());
        actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    } catch {
        return { cleanText, didUpdate: false };
    }

    const refMap: Record<string, string> = {};
    const nodesByRef: Record<string, Node[]> = {};
    const edgesByRef: Record<string, Edge[]> = {};
    const todosByRef: Record<string, string[]> = {};
    const writingByRef: Record<string, string> = {};
    const namesByRef: Record<string, string> = {};

    const current = getCanvas();
    const existingNodes = current?.nodes || [];
    const existingEdges = current?.edges || [];
    refMap['current'] = canvasId;
    nodesByRef['current'] = [...existingNodes];
    edgesByRef['current'] = [...existingEdges];

    for (const action of actions) {
        const ref = (action.canvasRef || action.ref || 'current').toLowerCase();
        const targetRef = ref === '' ? 'current' : ref;

        switch (action.type) {
            case 'create_canvas':
                if (workspaceId && action.ref) {
                    refMap[action.ref] = '__pending__';
                    nodesByRef[action.ref] = [];
                    edgesByRef[action.ref] = [];
                    todosByRef[action.ref] = [];
                    writingByRef[action.ref] = '';
                    namesByRef[action.ref] = action.name || 'New Project';
                }
                break;
            case 'add_node': {
                const r = targetRef === 'current' ? 'current' : (refMap[action.ref || ''] ? action.ref || 'current' : 'current');
                if (!nodesByRef[r]) nodesByRef[r] = r === 'current' ? [...existingNodes] : [];
                const node: Node = {
                    id: `strab-node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    type: (action.nodeType as Node['type']) || 'default',
                    position: { x: action.x ?? 100, y: action.y ?? 200 },
                    data: { label: action.label || '' },
                };
                nodesByRef[r].push(node);
                break;
            }
            case 'connect_nodes': {
                const r = targetRef === 'current' ? 'current' : (action.ref && refMap[action.ref] ? action.ref : 'current');
                const nodes = nodesByRef[r] || [];
                const src = nodes[action.fromIndex ?? 0];
                const tgt = nodes[action.toIndex ?? 1];
                if (src && tgt && !edgesByRef[r]) edgesByRef[r] = [];
                if (src && tgt) edgesByRef[r].push({
                    id: `strab-edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    source: src.id,
                    target: tgt.id,
                    type: 'smoothstep',
                    animated: true,
                } as Edge);
                break;
            }
            case 'set_writing':
                if (targetRef === 'current') {
                    if (action.content) updateCanvasWriting(canvasId, action.content);
                } else if (action.ref && action.content) {
                    writingByRef[action.ref] = action.content;
                }
                break;
            case 'add_todo':
                if (targetRef === 'current') {
                    if (action.text) addCanvasTodo(canvasId, action.text);
                } else if (action.ref && action.text) {
                    if (!todosByRef[action.ref]) todosByRef[action.ref] = [];
                    todosByRef[action.ref].push(action.text);
                }
                break;
        }
    }

    let didUpdate = false;
    if (nodesByRef['current']?.length !== existingNodes.length || edgesByRef['current']?.length !== existingEdges.length ||
        actions.some(a => (a.type === 'set_writing' || a.type === 'add_todo') && ((a.canvasRef || 'current').toLowerCase() === 'current' || !a.canvasRef))) {
        if (nodesByRef['current']) populateCanvas(canvasId, nodesByRef['current'], edgesByRef['current'] || []);
        didUpdate = true;
    }

    if (createProjectInWorkspace && workspaceId) {
        for (const ref of Object.keys(refMap)) {
            if (ref === 'current' || refMap[ref] !== '__pending__') continue;
            const newId = await createProjectInWorkspace(
                namesByRef[ref] || 'New Project',
                nodesByRef[ref] || [],
                edgesByRef[ref] || [],
                writingByRef[ref] || '',
                todosByRef[ref] || [],
            );
            if (newId) {
                ensureCanvasExists(newId);
                populateCanvas(newId, nodesByRef[ref] || [], edgesByRef[ref] || []);
                if (writingByRef[ref]) updateCanvasWriting(newId, writingByRef[ref]);
                for (const t of todosByRef[ref] || []) addCanvasTodo(newId, t);
                didUpdate = true;
            }
        }
    }

    return { cleanText, didUpdate };
}

export default function StrabView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const workspaceId = (location.state as { workspaceId?: number })?.workspaceId;
    const { user } = useUser();
    const { getToken } = useAuth();
    const paidUsers = useStore(state => state.paidUsers);
    const isGuest = !user;
    const isPaid = Boolean(user && (
        user.publicMetadata?.isPaid === true ||
        user.publicMetadata?.paid === true ||
        user.publicMetadata?.hasPaidAccess === true ||
        paidUsers[user.id]
    ));
    const canvas = useStore(state => state.canvases[id || '']);
    const dailyExecutionLogs = useStore(state => state.dailyExecutionLogs);
    const addCanvasGoal = useStore(state => state.addCanvasGoal);
    const updateCanvasGoal = useStore(state => state.updateCanvasGoal);
    const deleteCanvasGoal = useStore(state => state.deleteCanvasGoal);
    const addChatMessage = useStore(state => state.addChatMessage);
    const updateLastChatMessage = useStore(state => state.updateLastChatMessage);
    const clearChatHistory = useStore(state => state.clearChatHistory);
    const populateCanvas = useStore(state => state.populateCanvas);
    const updateCanvasWriting = useStore(state => state.updateCanvasWriting);
    const addCanvasTodo = useStore(state => state.addCanvasTodo);
    const ensureCanvasExists = useStore(state => state.ensureCanvasExists);
    const chatHistoryMap = useStore(state => state.chatHistory);
    const chatHistory = useMemo(() => chatHistoryMap[id || ''] || [], [chatHistoryMap, id]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'chat' | 'reports'>(tabParam === 'reports' ? 'reports' : 'chat');
    const [guestAiRemaining, setGuestAiRemaining] = useState(getGuestAiRemaining);
    const [proAiRemaining, setProAiRemaining] = useState(() => (user?.id ? getProAiRemaining(user.id) : PRO_AI_DAILY_LIMIT));
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (searchParams.get('tab') === 'reports') setActiveTab('reports');
        else if (searchParams.get('tab') === 'chat') setActiveTab('chat');
    }, [searchParams]);

    useEffect(() => {
        if (isGuest) setGuestAiRemaining(getGuestAiRemaining());
        if (isPaid && user?.id) setProAiRemaining(getProAiRemaining(user.id));
    }, [chatHistory, isGuest, isPaid, user?.id]);

    const resolvedName = canvas?.name && canvas.name !== 'Untitled Canvas' ? canvas.name : 'Project';

    const projectContext = useMemo(() => {
        const nodes = canvas?.nodes || [];
        const edges = canvas?.edges || [];
        const todos = canvas?.todos || [];

        // Build node label map for readable connection descriptions
        const nodeLabels = new Map(
            nodes.map(n => [n.id, (n.data?.label as string)?.trim() || `(${n.type || 'node'})`])
        );

        // Describe each connection as "A → B"
        const connections = edges
            .map(e => `${nodeLabels.get(e.source) || e.source} → ${nodeLabels.get(e.target) || e.target}`)
            .filter(Boolean);

        // Count node types
        const nodeTypeCounts = nodes.reduce<Record<string, number>>((acc, n) => {
            const t = n.type || 'idea';
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {});

        // Named nodes only (meaningful labels)
        const namedNodes = nodes
            .map(n => (n.data?.label as string)?.trim())
            .filter(Boolean);

        // Truncate writing to stay within token limits (~3000 chars)
        const writing = canvas?.writingContent
            ? canvas.writingContent.replace(/<<<SPLIT_SECTION_START>>>[\s\S]*<<<SPLIT_SECTION_END>>>/g, '[split-section]').substring(0, 3000) +
              (canvas.writingContent.length > 3000 ? '\n...[content truncated]' : '')
            : null;

        const writingWordCount = canvas?.writingContent
            ? canvas.writingContent.trim().split(/\s+/).filter(Boolean).length
            : 0;

        const completedTodos = todos.filter(t => t.completed);
        const pendingTodos = todos.filter(t => !t.completed);

        const daysSinceUpdate = Math.floor(
            (Date.now() - (canvas?.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)
        );

        const todayKey = new Date().toISOString().slice(0, 10);
        const todayLogKey = id ? `${todayKey}_${id}` : todayKey;
        const todayLog = dailyExecutionLogs?.[todayLogKey];

        return {
            name: resolvedName,
            canvasTitle: canvas?.title || null,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            nodeTypes: nodeTypeCounts,
            namedNodes,
            connections,
            tasks: {
                total: todos.length,
                completedCount: completedTodos.length,
                completionRate: todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0,
                completed: completedTodos.map(t => t.text),
                pending: pendingTodos.map(t => t.text),
            },
            writing,
            writingWordCount,
            writingTitle: canvas?.title || null,
            timeline: canvas?.timelineContent?.trim() || null,
            hasAttachments: (canvas?.attachments?.length || 0) > 0,
            attachmentCount: canvas?.attachments?.length || 0,
            hasImages: (canvas?.images?.length || 0) > 0,
            lastUpdated: new Date(canvas?.updatedAt || Date.now()).toISOString(),
            daysSinceUpdate,
            todayExecution: todayLog?.executed || null,
            blockers: todayLog?.blocking || null,
            tomorrowAction: todayLog?.tomorrowAction || null,
            goals: canvas?.goals?.map(g => ({
                label: g.label,
                current: g.currentValue,
                target: g.targetValue,
                unit: g.unit,
            })) || [],
            workspaceId: workspaceId ?? undefined,
        };
    }, [resolvedName, canvas, id, dailyExecutionLogs, workspaceId]);

    // Update page title
    useEffect(() => {
        document.title = `STRAB — ${resolvedName} | Stratabin`;
    }, [resolvedName]);

    // Kick off background server warm-up (non-blocking — UI is never gated on this)
    useEffect(() => {
        serverWarmup.start();
    }, []);

    // Initial Greeting — project-aware, no API call needed
    useEffect(() => {
        if (!id) return;
        const existing = useStore.getState().chatHistory[id] || [];
        if (existing.length === 0) {
            const c = useStore.getState().canvases[id];
            const name = c?.name && c.name !== 'Untitled Canvas' ? c.name : 'Project';
            const nodeCount = c?.nodes?.length || 0;
            const edgeCount = c?.edges?.length || 0;
            const todoCount = c?.todos?.length || 0;
            const completedCount = c?.todos?.filter(t => t.completed).length || 0;
            const wordCount = c?.writingContent?.trim().split(/\s+/).filter(Boolean).length || 0;

            const parts: string[] = [`I am **STRAB**. I've scanned **${name}**.`];

            if (nodeCount === 0) {
                parts.push('Your canvas is empty — start by mapping your key ideas so I can help you structure them.');
            } else {
                const stage = nodeCount < 4 ? 'early planning' : nodeCount < 10 ? 'active development' : 'detailed execution';
                parts.push(`You're in **${stage}** with ${nodeCount} nodes${edgeCount > 0 ? ` and ${edgeCount} connections` : ' but no connections yet'}.`);

                if (edgeCount === 0 && nodeCount > 1) {
                    parts.push('Your ideas aren\'t linked — connect them to reveal your strategy flow.');
                }
            }

            if (todoCount > 0) {
                const rate = Math.round((completedCount / todoCount) * 100);
                parts.push(`Tasks: **${completedCount}/${todoCount}** done (${rate}%).`);
            }

            if (wordCount > 50) {
                parts.push(`Writing section has ${wordCount.toLocaleString()} words.`);
            } else if (nodeCount > 3 && wordCount === 0) {
                parts.push('No writing yet — your strategy map exists but hasn\'t been written up.');
            }

            parts.push('Ask me anything about this project.');

            addChatMessage(id, { role: 'assistant', content: parts.join(' ') });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Auto-prompt logic for Selection Follow-up
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autoPrompt') === 'true' && !isLoading && chatHistory.length > 0) {
            const lastMsg = chatHistory[chatHistory.length - 1];
            if (lastMsg.role === 'user' && lastMsg.content.includes('Regarding this part:')) {
                window.history.replaceState({}, '', window.location.pathname);
                const triggerAi = async () => {
                    if (isGuest && getGuestAiRemaining() <= 0) {
                        toast.error('Guest AI limit reached. Sign up to continue.');
                        navigate('/', { replace: true });
                        return;
                    }
                    if (isPaid && user?.id && getProAiRemaining(user.id) <= 0) {
                        toast.error('Daily AI limit reached (12/day). Resets at midnight UTC.');
                        return;
                    }
                    setIsLoading(true);
                    addChatMessage(id!, { role: 'assistant', content: 'Processing...' });
                    if (isGuest) {
                        consumeGuestAiMessage();
                        setGuestAiRemaining(getGuestAiRemaining());
                    }
                    if (isPaid && user?.id) {
                        consumeProAiMessage(user.id);
                        setProAiRemaining(getProAiRemaining(user.id));
                    }
                    try {
                        const token = await getToken();
                        let fullText = '';
                        await sendStrabMessageStreaming(
                            chatHistory,
                            projectContext,
                            (text) => { fullText = text; },
                            token ?? undefined,
                        );
                        updateLastChatMessage(id!, fullText);
                    } catch (err) {
                        if (isGuest) {
                            refundGuestAiMessage();
                            setGuestAiRemaining(getGuestAiRemaining());
                        }
                        if (isPaid && user?.id) {
                            refundProAiMessage(user.id);
                            setProAiRemaining(getProAiRemaining(user.id));
                        }
                        const msg = (err as Error)?.message?.includes('503')
                            ? 'Server waking up — please try again in a moment.'
                            : 'STRAB is unreachable. Please try again.';
                        toast.error(msg);
                    } finally {
                        setIsLoading(false);
                    }
                };
                triggerAi();
            }
        }
    }, [id, chatHistory, isLoading, projectContext, addChatMessage, updateLastChatMessage, getToken, isGuest, isPaid, user?.id, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim() || isLoading) return;

        if (isGuest) {
            const remaining = getGuestAiRemaining();
            if (remaining <= 0) {
                toast.error('Guest AI limit reached. Sign up to continue.');
                navigate('/', { replace: true });
                return;
            }
        }
        if (isPaid && user?.id) {
            const remaining = getProAiRemaining(user.id);
            if (remaining <= 0) {
                toast.error('Daily AI limit reached (12/day). Resets at midnight UTC.');
                return;
            }
        }

        const userMsg: ChatMessage = { role: 'user', content: message };
        addChatMessage(id!, userMsg);
        addChatMessage(id!, { role: 'assistant', content: 'Processing...' });
        setIsLoading(true);

        if (isGuest) {
            consumeGuestAiMessage();
            setGuestAiRemaining(getGuestAiRemaining());
        }
        if (isPaid && user?.id) {
            consumeProAiMessage(user.id);
            setProAiRemaining(getProAiRemaining(user.id));
        }

        try {
            const token = await getToken();
            const messagesForApi = [...chatHistory, userMsg];
            let fullText = '';
            await sendStrabMessageStreaming(
                messagesForApi,
                projectContext,
                (text) => { fullText = text; },
                token ?? undefined,
            );
            const createProjectInWorkspace = workspaceId && token
                ? async (name: string, nodes: Node[], edges: Edge[], writing: string, _todos: string[]) => {
                    try {
                        const res = await workspaceService.createProject(workspaceId, { title: name }, token);
                        const project = res?.project ?? res;
                        if (!project?.id) return null;
                        const canvasId = `proj_${project.id}`;
                        await workspaceService.updateProject(project.id, { canvasId }, token);
                        await workspaceService.saveProjectCanvas(project.id, {
                            nodes,
                            edges,
                            writingContent: writing,
                            name,
                        }, token);
                        return canvasId;
                    } catch {
                        return null;
                    }
                }
                : null;
            const { cleanText, didUpdate } = await parseAndExecuteForCurrentCanvas(
                fullText,
                id!,
                workspaceId,
                () => useStore.getState().canvases[id!],
                populateCanvas,
                updateCanvasWriting,
                addCanvasTodo,
                ensureCanvasExists,
                createProjectInWorkspace,
            );
            updateLastChatMessage(id!, cleanText);
            if (didUpdate) toast.success('Flow updated');
        } catch (err) {
            if (isGuest) {
                refundGuestAiMessage();
                setGuestAiRemaining(getGuestAiRemaining());
            }
            if (isPaid && user?.id) {
                refundProAiMessage(user.id);
                setProAiRemaining(getProAiRemaining(user.id));
            }
            const msg = (err as Error)?.message?.includes('503')
                ? 'Server waking up — please try again in a moment.'
                : 'STRAB is unreachable. Please try again.';
            toast.error(msg);
            updateLastChatMessage(id!, "I'm having trouble connecting right now. Please try again in a moment.");
        } finally {
            setIsLoading(false);
        }
    }, [id, chatHistory, projectContext, addChatMessage, updateLastChatMessage, populateCanvas, updateCanvasWriting, addCanvasTodo, ensureCanvasExists, workspaceId, getToken, isLoading, isGuest, isPaid, user?.id, navigate]);

    const handleSend = useCallback(() => {
        if (!input.trim()) return;
        const msg = input;
        setInput('');
        sendMessage(msg);
    }, [input, sendMessage]);

    const handleOptionSelect = useCallback((option: string) => {
        sendMessage(option);
    }, [sendMessage]);

    const handleGenerateReport = useCallback(() => {
        setActiveTab('chat');
        sendMessage(
            `Generate a comprehensive analysis report for "${resolvedName}". ` +
            `Structure it with these exact sections:\n` +
            `1. PROJECT SNAPSHOT — what this project is about, its current stage\n` +
            `2. CANVAS ANALYSIS — what the node map and connections reveal about the strategy, key themes, gaps\n` +
            `3. TASK STATUS — completion rate, which pending tasks need attention first, any blockers\n` +
            `4. WRITING REVIEW — key points in the writing section, quality, what's missing (if writing exists)\n` +
            `5. TIMELINE STATUS — progress against stated milestones (if timeline exists)\n` +
            `6. RISKS & OPPORTUNITIES — what could derail this, what's going well\n` +
            `7. RANKED NEXT ACTIONS — top 3–5 specific things to do right now, in priority order\n` +
            `Be direct, specific, and reference actual data from the project. No filler.`
        );
    }, [sendMessage, resolvedName]);

    // Compute real report metrics
    const totalTasks = canvas?.todos?.length || 0;
    const completedTasks = canvas?.todos?.filter(t => t.completed).length || 0;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const incompleteCount = totalTasks - completedTasks;
    const writingWordCount = canvas?.writingContent
        ? canvas.writingContent.trim().split(/\s+/).filter(Boolean).length : 0;
    const daysSinceUpdate = Math.floor((Date.now() - (canvas?.updatedAt || Date.now())) / (1000 * 60 * 60 * 24));
    const hasTimeline = !!(canvas?.timelineContent?.trim());
    const projectStage = canvas?.nodes?.length === 0 ? 'Empty'
        : canvas?.nodes?.length < 4 ? 'Planning'
        : canvas?.nodes?.length < 10 ? 'In Progress'
        : 'Execution';

    const QUICK_INSIGHTS = [
        { label: 'What should I do next?', icon: '→' },
        { label: 'What are my biggest risks?', icon: '⚠' },
        { label: 'Summarise this project', icon: '◎' },
        { label: 'Review my writing', icon: '✦' },
        { label: 'Analyse my strategy flow', icon: '⬡' },
        { label: 'What am I missing?', icon: '?' },
    ];

    const DAILY_EXECUTION_PROMPTS = [
        { label: 'What did I execute today?', icon: '✓' },
        { label: "What's blocking my progress?", icon: '!' },
        { label: "What's my top action for tomorrow?", icon: '→' },
    ];

    const ACCOUNTABILITY_PROMPTS = [
        { label: "Challenge my plan — what's weak?", icon: '⚡' },
        { label: "Hold me accountable — what must I do today?", icon: '🎯' },
        { label: "What would I miss if I don't act?", icon: '?' },
    ];

    if (!canvas) return (
        <div className="flex flex-col items-center justify-center h-screen theme-page text-white gap-4">
            <p className="text-white/50">Project not found.</p>
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-all">
                Back to Dashboard
            </button>
        </div>
    );

        return (
        <div className="flex flex-col h-screen theme-page text-white overflow-hidden relative">
            {/* Header */}
            <div className="h-13 md:h-16 border-b border-white/[0.04] flex items-center px-2 md:px-6 theme-panel backdrop-blur-2xl z-10 flex-shrink-0 gap-1.5 md:gap-2">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) navigate(-1);
                            else navigate(id ? `/strategy/${id}` : '/dashboard');
                        }}
                    className="p-1.5 md:p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 active:scale-95 transition-all shrink-0"
                    aria-label="Go back"
                >
                    <ArrowLeft size={18} />
                </button>

                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Network size={13} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold text-[13px] leading-tight">STRAB <span className="text-white/25 font-normal text-[11px]">AI</span></h1>
                        <p className="text-[9px] text-white/25 leading-none mt-0.5 truncate hidden sm:block">{resolvedName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    {isGuest && (
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-[11px] font-bold hover:bg-primary/20 transition-all"
                        >
                            <Sparkles size={12} />
                            {guestAiRemaining > 0 ? `${guestAiRemaining} AI left` : 'Upgrade'}
                        </button>
                    )}
                    {isPaid && (
                        <span
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/60 text-[10px] md:text-[11px] font-bold"
                            title="Resets at midnight UTC"
                        >
                            <Sparkles size={12} />
                            {proAiRemaining > 0 ? `${proAiRemaining}/12 today` : 'Limit reached'}
                        </span>
                    )}
                    <div className="flex bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.04]">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all active:scale-95 ${activeTab === 'chat' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white/60'}`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all active:scale-95 ${activeTab === 'reports' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white/60'}`}
                        >
                            Reports
                        </button>
                    </div>
                    <button
                        onClick={() => clearChatHistory(id!)}
                        className="p-1.5 md:p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-white/5 active:scale-95 transition-all"
                        aria-label="Clear conversation"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex">

                {/* Chat View */}
                {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full">

                        <div
                            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar"
                            aria-live="polite"
                            aria-label="Chat messages"
                        >
                            {chatHistory.map((msg, idx) => {
                                let isInteractive = false;
                                let parsedJson: { question: string; options: string[] } | null = null;
                                if (msg.role === 'assistant' && msg.content.toLowerCase().includes('```json')) {
                                    try {
                                        const match = msg.content.match(/```json\s*([\s\S]*?)```/i);
                                        if (match) {
                                            const parsed = JSON.parse(match[1].trim());
                                            if (parsed?.type === 'clarification' && Array.isArray(parsed?.options) && parsed.options.length > 0) {
                                                const question = parsed.question ?? parsed.prompt ?? 'Choose an option:';
                                                const options = parsed.options.map((o: unknown) => typeof o === 'string' ? o : (o as { label?: string; text?: string })?.label ?? (o as { label?: string; text?: string })?.text ?? String(o));
                                                parsedJson = { question, options };
                                                isInteractive = true;
                                            }
                                        }
                                    } catch {
                                        // Not valid JSON, render normally
                                    }
                                }

                                return (
                                    <div key={idx} className={`flex gap-2.5 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/[0.06]' : 'bg-[#111] border border-white/[0.04] text-white/70'}`}>
                                            {msg.role === 'user' ? <div className="w-1.5 h-1.5 bg-white rounded-full" /> : <Network size={13} />}
                                        </div>
                                        <div className={`p-3 md:p-4 rounded-2xl max-w-[85%] md:max-w-[80%] text-[13px] md:text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white/[0.04] border border-white/[0.04] text-white/90' : 'text-white/75'}`}>
                                            {isInteractive && parsedJson ? (
                                                <div className="space-y-4">
                                                    <div className="font-medium text-white text-base">
                                                        {parsedJson.question}
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {parsedJson.options.map((opt: string, i: number) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleOptionSelect(opt)}
                                                                disabled={isLoading}
                                                                className="text-left px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-white/20 hover:bg-[#222] transition-colors text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap">
                                                    {msg.content.replace(/```json[\s\S]*?```/gi, '')}
                                                    {isLoading && idx === chatHistory.length - 1 && msg.role === 'assistant' && msg.content.length > 0 && (
                                                        <span className="inline-block w-[2px] h-[1em] bg-primary/70 ml-0.5 align-middle animate-pulse" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {isLoading && (() => {
                                const lastMsg = chatHistory[chatHistory.length - 1];
                                const isStreaming = lastMsg?.role === 'assistant' && lastMsg.content.length > 0;
                                if (isStreaming) return null;
                                return (
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-[#151515] border border-white/5 text-white/80">
                                            <Network size={14} />
                                        </div>
                                        <div className="p-4 text-white/30 text-sm flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            Connecting…
                                        </div>
                                    </div>
                                );
                            })()}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick-action chips */}
                        <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 border-t border-white/[0.06]">
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar-hide">
                                {QUICK_INSIGHTS.slice(0, 4).map(({ label }) => (
                                    <button
                                        key={label}
                                        onClick={() => sendMessage(label)}
                                        disabled={isLoading}
                                        className="shrink-0 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-medium text-white/45 hover:text-white hover:border-white/20 hover:bg-white/[0.08] active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar-hide">
                                {[...DAILY_EXECUTION_PROMPTS, ...ACCOUNTABILITY_PROMPTS].map(({ label }) => (
                                    <button
                                        key={label}
                                        onClick={() => sendMessage(label)}
                                        disabled={isLoading}
                                        className="shrink-0 px-3 py-1.5 rounded-full bg-primary/[0.08] border border-primary/20 text-[11px] font-medium text-primary/80 hover:text-primary hover:border-primary/40 hover:bg-primary/[0.12] active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Area — pb-[68px] compensates for fixed MobileNav on mobile */}
                        <div className="px-2 md:px-3 py-2 md:py-3 pb-[68px] md:pb-3 theme-panel border-t border-white/[0.03]">
                            <div className="relative max-w-3xl mx-auto">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                    placeholder="Ask STRAB anything…"
                                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3.5 md:py-3.5 pl-4 pr-14 md:pr-12 text-base md:text-base text-white focus:border-primary/30 focus:bg-white/[0.06] outline-none transition-all placeholder-white/15 min-h-[48px] touch-manipulation"
                                    aria-label="Message STRAB"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 md:w-9 md:h-9 flex items-center justify-center bg-primary text-black rounded-xl disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all min-w-[44px] min-h-[44px] touch-manipulation"
                                    aria-label="Send message"
                                >
                                    {isLoading
                                        ? <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        : <Send size={13} strokeWidth={2.5} />
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports View */}
                {activeTab === 'reports' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 md:pb-8 space-y-6">

                            {/* Metric grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-[#151515] border border-white/5 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Stage</div>
                                    <div className="text-lg font-bold text-white">{projectStage}</div>
                                    <div className="text-[11px] text-white/30 mt-1">{canvas.nodes.length} ideas · {canvas.edges.length} connections</div>
                                </div>
                                <div className="bg-[#151515] border border-white/5 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Task Progress</div>
                                    <div className="text-lg font-bold text-white">{completionPercent}%</div>
                                    <div className="text-[11px] text-white/30 mt-1">{completedTasks}/{totalTasks} completed</div>
                                    <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all" style={{ width: `${completionPercent}%` }} />
                                    </div>
                                </div>
                                <div className="bg-[#151515] border border-white/5 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Writing</div>
                                    <div className="text-lg font-bold text-white">{writingWordCount.toLocaleString()}</div>
                                    <div className="text-[11px] text-white/30 mt-1">words written</div>
                                </div>
                                <div className="bg-[#151515] border border-white/5 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Last Updated</div>
                                    <div className="text-lg font-bold text-white">{daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`}</div>
                                    <div className="text-[11px] text-white/30 mt-1">{new Date(canvas.updatedAt).toLocaleDateString()}</div>
                                </div>
                            </div>

                            {/* Status checklist */}
                            <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Project Coverage</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { label: 'Ideas', ok: canvas.nodes.length > 0, value: `${canvas.nodes.length} ideas` },
                                        { label: 'Tasks', ok: totalTasks > 0, value: totalTasks > 0 ? `${incompleteCount} pending` : 'None added' },
                                        { label: 'Writing', ok: writingWordCount > 50, value: writingWordCount > 0 ? `${writingWordCount} words` : 'Empty' },
                                        { label: 'Timeline', ok: hasTimeline, value: hasTimeline ? 'Defined' : 'Not set' },
                                        { label: 'Connections', ok: canvas.edges.length > 0, value: `${canvas.edges.length} edges` },
                                        { label: 'Attachments', ok: (canvas.attachments?.length || 0) > 0, value: canvas.attachments?.length ? `${canvas.attachments.length} files` : 'None' },
                                    ].map(({ label, ok, value }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-green-500' : 'bg-white/10'}`} />
                                            <div>
                                                <div className="text-xs text-white/60">{label}</div>
                                                <div className={`text-[11px] font-bold ${ok ? 'text-white/80' : 'text-white/20'}`}>{value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pending tasks list */}
                            {incompleteCount > 0 && (
                                <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">
                                        Open Tasks <span className="text-orange-400 ml-1">{incompleteCount}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {canvas.todos?.filter(t => !t.completed).map(t => (
                                            <div key={t.id} className="flex items-start gap-3 text-sm text-white/60">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 mt-2 shrink-0" />
                                                {t.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Outcome Goals — track real results */}
                            <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                                        <Target size={12} /> Outcome Goals
                                    </div>
                                    <button
                                        onClick={() => {
                                            const label = window.prompt('Goal (e.g. Launch product, 100 users)');
                                            if (label?.trim()) addCanvasGoal(id!, { label: label.trim(), targetMetric: label.trim() });
                                        }}
                                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {canvas.goals && canvas.goals.length > 0 ? (
                                    <div className="space-y-3">
                                        {canvas.goals.map(g => {
                                            const pct = (g.targetValue != null && g.currentValue != null && g.targetValue > 0)
                                                ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0;
                                            return (
                                                <div key={g.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-bold text-white/80">{g.label}</span>
                                                        <button onClick={() => deleteCanvasGoal(id!, g.id)} className="p-1 text-white/30 hover:text-red-400 rounded">
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                    {(g.targetValue != null || g.currentValue != null) && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <input
                                                                type="number"
                                                                value={g.currentValue ?? ''}
                                                                onChange={(e) => updateCanvasGoal(id!, g.id, { currentValue: e.target.value ? Number(e.target.value) : undefined })}
                                                                placeholder="Current"
                                                                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] text-white"
                                                            />
                                                            <span className="text-white/40 text-[11px]">/</span>
                                                            <input
                                                                type="number"
                                                                value={g.targetValue ?? ''}
                                                                onChange={(e) => updateCanvasGoal(id!, g.id, { targetValue: e.target.value ? Number(e.target.value) : undefined })}
                                                                placeholder="Target"
                                                                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] text-white"
                                                            />
                                                            {g.unit && <span className="text-[10px] text-white/50">{g.unit}</span>}
                                                        </div>
                                                    )}
                                                    {g.targetValue != null && g.currentValue != null && g.targetValue > 0 && (
                                                        <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-white/40">Add goals to track outcomes (users, revenue, milestones)</p>
                                )}
                            </div>

                            {/* Execution & Accountability prompts */}
                            <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Execution & Accountability</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {[...DAILY_EXECUTION_PROMPTS, ...ACCOUNTABILITY_PROMPTS].map(({ label }) => (
                                        <button
                                            key={label}
                                            onClick={() => { setActiveTab('chat'); sendMessage(label); }}
                                            className="text-left px-3 py-2.5 rounded-xl bg-primary/[0.06] border border-primary/15 hover:border-primary/30 text-[11px] text-primary/90 hover:text-primary transition-all"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Report button */}
                            <button
                                onClick={handleGenerateReport}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 text-orange-400 font-black text-sm uppercase tracking-widest hover:from-orange-500/20 hover:to-orange-500/10 transition-all flex items-center justify-center gap-3"
                            >
                                <Sparkles size={16} />
                                Generate Full AI Report
                            </button>

                            {/* Quick insight prompts */}
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Quick Insights</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {QUICK_INSIGHTS.map(({ label, icon }) => (
                                        <button
                                            key={label}
                                            onClick={() => { setActiveTab('chat'); sendMessage(label); }}
                                            className="text-left px-4 py-3 rounded-xl bg-[#151515] border border-white/5 hover:border-white/20 hover:bg-[#1a1a1a] transition-all text-xs text-white/50 hover:text-white flex items-center gap-2"
                                        >
                                            <span className="text-white/20 font-mono">{icon}</span>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </div>
            {id && <MobileNav canvasId={id} />}
        </div>
    );
}
