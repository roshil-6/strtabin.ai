import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
    getProAiRemaining,
    consumeProAiMessage,
    refundProAiMessage,
    getGuestAiRemaining,
    consumeGuestAiMessage,
    refundGuestAiMessage,
    GUEST_AI_LIMIT,
} from '../constants';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { sendGeneralStrabMessage, strabVisibleAssistantText, type ChatMessage } from '../services/strabService';
import { serverWarmup } from '../services/serverWarmup';
import {
    Send, Network, ArrowLeft, Trash2, ExternalLink, Zap, Sparkles,
    GitBranch, Lightbulb, Target, Layers, Rocket, Map,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

// ── Types ─────────────────────────────────────────────────────────────────

interface StrabAction {
    type: 'create_canvas' | 'add_node' | 'connect_nodes' | 'set_writing' | 'add_todo';
    // create_canvas
    name?: string;
    ref?: string;
    // add_node
    canvasRef?: string;
    nodeType?: 'default' | 'question' | 'decision' | 'text';
    label?: string;
    x?: number;
    y?: number;
    // connect_nodes
    fromIndex?: number;
    toIndex?: number;
    // set_writing
    content?: string;
    // add_todo
    text?: string;
}

interface CreatedProject {
    id: string;
    name: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    createdProjects?: CreatedProject[];
}

// ── Example prompts shown on welcome screen ───────────────────────────────
const EXAMPLES = [
    {
        icon: Rocket,
        label: 'Product launch plan',
        prompt: 'Create a product launch strategy canvas for a new mobile app',
        accent: '#f97316',
    },
    {
        icon: Target,
        label: 'Marketing strategy',
        prompt: 'Build me a complete marketing strategy canvas for a B2B SaaS startup',
        accent: '#f59e0b',
    },
    {
        icon: GitBranch,
        label: 'Startup roadmap',
        prompt: 'Create a 6-month startup roadmap canvas with key milestones and decisions',
        accent: '#8b5cf6',
    },
    {
        icon: Lightbulb,
        label: 'Business idea validation',
        prompt: 'Help me validate a business idea — build a canvas to structure my thinking',
        accent: '#10b981',
    },
    {
        icon: Layers,
        label: 'Content strategy',
        prompt: 'Create a content marketing strategy canvas with distribution channels and goals',
        accent: '#ec4899',
    },
    {
        icon: Map,
        label: 'Project planning',
        prompt: 'Build a project planning canvas with phases, tasks, risks and decisions',
        accent: '#14b8a6',
    },
];

// ── Action executor ───────────────────────────────────────────────────────
function parseAndExecuteActions(
    raw: string,
    createCanvas: () => string,
    populateCanvas: (id: string, nodes: Node[], edges: Edge[]) => void,
    updateCanvasName: (id: string, name: string) => void,
    updateCanvasWriting: (id: string, content: string) => void,
    addCanvasTodo: (id: string, text: string) => void,
): { cleanText: string; createdProjects: CreatedProject[] } {
    const actionMatch = raw.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
    const cleanText = strabVisibleAssistantText(raw, 'final');

    if (!actionMatch) return { cleanText, createdProjects: [] };

    let actions: StrabAction[] = [];
    try {
        const parsed = JSON.parse(actionMatch[1].trim());
        actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    } catch {
        return { cleanText, createdProjects: [] };
    }

    const refMap: Record<string, string> = {};
    const nodesByRef: Record<string, Node[]> = {};
    const edgesByRef: Record<string, Edge[]> = {};
    const createdProjects: CreatedProject[] = [];

    for (const action of actions) {
        switch (action.type) {
            case 'create_canvas': {
                const id = createCanvas();
                if (action.name) updateCanvasName(id, action.name);
                if (action.ref) {
                    refMap[action.ref] = id;
                    nodesByRef[action.ref] = [];
                    edgesByRef[action.ref] = [];
                }
                createdProjects.push({ id, name: action.name || 'New Project' });
                break;
            }
            case 'add_node': {
                const ref = action.canvasRef || '';
                if (!nodesByRef[ref]) nodesByRef[ref] = [];
                const node: Node = {
                    id: `strab-node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    type: action.nodeType || 'default',
                    position: { x: action.x ?? 100, y: action.y ?? 200 },
                    data: { label: action.label || '' },
                };
                nodesByRef[ref].push(node);
                break;
            }
            case 'connect_nodes': {
                const ref = action.canvasRef || '';
                const nodes = nodesByRef[ref] || [];
                const src = nodes[action.fromIndex ?? 0];
                const tgt = nodes[action.toIndex ?? 1];
                if (src && tgt) {
                    if (!edgesByRef[ref]) edgesByRef[ref] = [];
                    edgesByRef[ref].push({
                        id: `strab-edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        source: src.id,
                        target: tgt.id,
                        type: 'smoothstep',
                        animated: true,
                    });
                }
                break;
            }
            case 'set_writing': {
                const ref = action.canvasRef || '';
                const canvasId = refMap[ref];
                if (canvasId && action.content) updateCanvasWriting(canvasId, action.content);
                break;
            }
            case 'add_todo': {
                const ref = action.canvasRef || '';
                const canvasId = refMap[ref];
                if (canvasId && action.text) addCanvasTodo(canvasId, action.text);
                break;
            }
        }
    }

    // Flush nodes + edges to each canvas after all actions are processed
    for (const ref of Object.keys(refMap)) {
        const canvasId = refMap[ref];
        populateCanvas(canvasId, nodesByRef[ref] || [], edgesByRef[ref] || []);
    }

    return { cleanText, createdProjects };
}

// ── Component ─────────────────────────────────────────────────────────────
export default function StrabHome() {
    const navigate = useNavigate();
    const { user } = useUser();
    const { getToken, isSignedIn, isLoaded: authLoaded } = useAuth();
    const isGuest = authLoaded && !isSignedIn;

    const { createCanvas, populateCanvas, updateCanvasName, updateCanvasWriting, addCanvasTodo } =
        useStore(useShallow(s => ({
            createCanvas: s.createCanvas,
            populateCanvas: s.populateCanvas,
            updateCanvasName: s.updateCanvasName,
            updateCanvasWriting: s.updateCanvasWriting,
            addCanvasTodo: s.addCanvasTodo,
        })));

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [proAiRemaining, setProAiRemaining] = useState(() => (user?.id ? getProAiRemaining(user.id) : 12));
    const [guestAiRemaining, setGuestAiRemaining] = useState(getGuestAiRemaining);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isGuest) setGuestAiRemaining(getGuestAiRemaining());
        if (user?.id) setProAiRemaining(getProAiRemaining(user.id));
    }, [messages, isGuest, user?.id]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        document.title = 'STRAB — New strategies (hub) | Stratabin';
        serverWarmup.start();
        return () => { document.title = 'Stratabin AI — Strategy Workspace'; };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;

        if (isGuest) {
            if (getGuestAiRemaining() <= 0) {
                toast.error('Guest AI limit reached. Sign in for more.', {
                    style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
                });
                navigate('/auth', { replace: true });
                return;
            }
        }
        if (user?.id) {
            const remaining = getProAiRemaining(user.id);
            if (remaining <= 0) {
                toast.error('Daily AI limit reached (12/day). Resets at midnight UTC.', {
                    style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
                });
                return;
            }
        }

        setInput('');

        const userMsg: Message = { role: 'user', content: text };
        const assistantMsg: Message = { role: 'assistant', content: '' };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setIsLoading(true);

        if (isGuest) {
            consumeGuestAiMessage();
            setGuestAiRemaining(getGuestAiRemaining());
        }
        if (user?.id) {
            consumeProAiMessage(user.id);
            setProAiRemaining(getProAiRemaining(user.id));
        }

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const token = await getToken();
            const apiMessages: ChatMessage[] = [...messages, userMsg].map(m => ({
                role: m.role,
                content: m.content,
            }));

            let fullText = '';
            await sendGeneralStrabMessage(
                apiMessages,
                (accumulated) => {
                    fullText = accumulated;
                    setMessages(prev => {
                        const copy = [...prev];
                        copy[copy.length - 1] = {
                            role: 'assistant',
                            content: strabVisibleAssistantText(accumulated, 'streaming'),
                        };
                        return copy;
                    });
                },
                token ?? undefined,
                controller.signal,
            );

            // After streaming — parse action block
            const { cleanText, createdProjects } = parseAndExecuteActions(
                fullText,
                createCanvas,
                populateCanvas,
                updateCanvasName,
                updateCanvasWriting,
                addCanvasTodo,
            );

            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: cleanText, createdProjects };
                return copy;
            });

            if (createdProjects.length > 0) {
                toast.success(`Created ${createdProjects.length} project${createdProjects.length > 1 ? 's' : ''}`, {
                    style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
                });
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            if (isGuest) {
                refundGuestAiMessage();
                setGuestAiRemaining(getGuestAiRemaining());
            }
            if (user?.id) {
                refundProAiMessage(user.id);
                setProAiRemaining(getProAiRemaining(user.id));
            }
            const msg = (err as Error)?.message?.includes('503')
                ? 'Server waking up — please try again in a moment.'
                : 'STRAB is unreachable. Please try again.';
            toast.error(msg, {
                style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
            });
            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." };
                return copy;
            });
        } finally {
            setIsLoading(false);
            abortRef.current = null;
        }
    }, [isLoading, messages, getToken, createCanvas, populateCanvas, updateCanvasName, updateCanvasWriting, addCanvasTodo, user?.id, navigate, isGuest]);

    const handleSend = useCallback(() => {
        if (input.trim()) sendMessage(input.trim());
    }, [input, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        abortRef.current?.abort();
        setMessages([]);
        setIsLoading(false);
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="flex flex-col h-screen theme-page text-white overflow-hidden">

            {/* Header */}
            <div className="h-14 border-b border-white/[0.04] flex items-center px-3 md:px-6 theme-panel backdrop-blur-2xl z-20 flex-shrink-0 gap-2">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all shrink-0"
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft size={18} />
                </button>

                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {isGuest ? (
                        <button
                            type="button"
                            onClick={() => navigate('/auth')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold shrink-0 hover:bg-amber-500/20 transition-colors"
                            title="Sign in for higher STRAB limits"
                        >
                            <Sparkles size={12} />
                            {guestAiRemaining > 0 ? `${guestAiRemaining}/${GUEST_AI_LIMIT} guest` : 'Sign in'}
                        </button>
                    ) : (
                        <span
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/60 text-[10px] font-bold shrink-0"
                            title="Resets at midnight UTC"
                        >
                            <Sparkles size={12} />
                            {proAiRemaining > 0 ? `${proAiRemaining}/12 today` : 'Limit reached'}
                        </span>
                    )}
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                        <Network size={14} className="text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-sm tracking-tight">STRAB</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1.5 py-0.5 bg-white/[0.04] rounded-md border border-white/[0.06]">AI</span>
                        </div>
                        <p className="text-[10px] text-white/25 leading-none mt-0.5 hidden sm:block">Strategy hub — new canvases from scratch</p>
                    </div>
                </div>

                {messages.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-white/[0.04] active:scale-95 transition-all shrink-0"
                        title="Clear conversation"
                    >
                        <Trash2 size={15} />
                    </button>
                )}
            </div>

            {/* Main */}
            <div className="flex-1 overflow-hidden flex flex-col">

                {/* Maintenance Banner */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-amber-300">AI is under maintenance</span>
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    </div>
                    <p className="text-xs text-amber-200/70">We are working on integrating a more powerful AI system for an upcoming major project. Check back soon!</p>
                </div>

                {isEmpty ? (
                    /* ── Welcome screen ── */
                    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-10">
                        {/* Logo mark */}
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(249,115,22,0.12)]">
                            <Network size={28} className="text-primary" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-2 text-center">
                            What are we building?
                        </h1>
                        <p className="text-white/35 text-sm md:text-base text-center max-w-md mb-4 leading-relaxed">
                            Describe a project, strategy, or workflow — STRAB will create the entire canvas with ideas, connections, and a writing outline automatically.
                        </p>
                        <div className="w-full max-w-lg mb-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left">
                            <p className="text-[11px] md:text-xs text-white/50 leading-relaxed">
                                <span className="font-bold text-primary/90">Already have a project?</span>{' '}
                                Open it from the <span className="text-white/70 font-semibold">Dashboard</span>, then use{' '}
                                <span className="text-white/70 font-semibold">Project STRAB</span> on that card —{' '}
                                <span className="text-white/40">chat, Reports &amp; follow-up</span> for{' '}
                                <em>that</em> workspace. <span className="text-white/35">This hub is only for brand-new strategy canvases.</span>
                            </p>
                        </div>

                        {/* Example prompt grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mb-10">
                            {EXAMPLES.map(({ icon: Icon, label, prompt, accent }) => (
                                <button
                                    key={label}
                                    onClick={() => sendMessage(prompt)}
                                    className="group flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] active:scale-[0.98] transition-all text-left"
                                >
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all group-hover:scale-110"
                                        style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
                                    >
                                        <Icon size={14} style={{ color: accent }} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{label}</div>
                                        <div className="text-[11px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">{prompt}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Capability pills */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {['Creates canvases', 'Adds ideas', 'Builds connections', 'Writes outlines', 'Sets up tasks'].map(pill => (
                                <span key={pill} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/30 font-medium flex items-center gap-1.5">
                                    <Zap size={10} className="text-primary/60" />
                                    {pill}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ── Chat thread ── */
                    <div className="flex-1 overflow-y-auto px-3 md:px-0 py-6 space-y-6 custom-scrollbar">
                        <div className="max-w-3xl mx-auto w-full space-y-6">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                                        msg.role === 'user'
                                            ? 'bg-white/[0.06] border border-white/[0.06]'
                                            : 'bg-primary/10 border border-primary/20'
                                    }`}>
                                        {msg.role === 'user'
                                            ? <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                                            : <Network size={13} className="text-primary" />
                                        }
                                    </div>

                                    <div className={`flex-1 max-w-[88%] space-y-3 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                                        {/* Message bubble */}
                                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-white/[0.05] border border-white/[0.06] text-white/85 max-w-lg'
                                                : 'text-white/80'
                                        }`}>
                                            {(() => {
                                                const display =
                                                    msg.role === 'assistant'
                                                        ? strabVisibleAssistantText(
                                                            msg.content,
                                                            isLoading && idx === messages.length - 1 ? 'streaming' : 'final',
                                                        )
                                                        : msg.content;
                                                if (display) {
                                                    return (
                                                        <div className="whitespace-pre-wrap">
                                                            {display}
                                                            {isLoading && idx === messages.length - 1 && msg.role === 'assistant' && display.length > 0 && (
                                                                <span className="inline-block w-[2px] h-[1em] bg-primary/70 ml-0.5 align-middle animate-pulse" aria-hidden />
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                if (isLoading && idx === messages.length - 1 && msg.role === 'assistant') {
                                                    return (
                                                        <div className="flex items-center gap-3 text-white/40">
                                                            <div className="flex gap-1">
                                                                {[0, 150, 300].map(d => (
                                                                    <span key={d} className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                                                ))}
                                                            </div>
                                                            <span className="text-xs text-white/55">Sketching your strategy…</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {/* Created project cards */}
                                        {msg.createdProjects && msg.createdProjects.length > 0 && (
                                            <div className="space-y-2 w-full">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-white/25 flex items-center gap-1.5">
                                                    <Zap size={10} className="text-primary" />
                                                    Created
                                                </p>
                                                {msg.createdProjects.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => navigate(`/strategy/${p.id}`)}
                                                        className="group w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-primary/8 border border-primary/20 hover:bg-primary/12 hover:border-primary/35 active:scale-[0.99] transition-all text-left"
                                                        style={{ background: 'rgba(249,115,22,0.07)' }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                                <Layers size={13} className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-white">{p.name}</div>
                                                                <div className="text-[11px] text-white/35 mt-0.5">Canvas ready — click to open</div>
                                                            </div>
                                                        </div>
                                                        <ExternalLink size={14} className="text-primary/50 group-hover:text-primary transition-colors shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className={`px-3 md:px-6 py-3 theme-panel flex-shrink-0 ${isEmpty ? '' : 'border-t border-white/[0.04]'}`}>
                    <div className="max-w-3xl mx-auto">
                        <div className="relative flex items-end gap-2 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 focus-within:border-primary/25 focus-within:bg-white/[0.05] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
                                onKeyDown={handleKeyDown}
                                placeholder={isEmpty ? 'Describe what you want to build…' : 'Ask anything or create a new canvas…'}
                                className="flex-1 bg-transparent text-sm text-white outline-none resize-none placeholder-white/20 leading-relaxed min-h-[24px] max-h-[140px] py-0.5"
                                rows={1}
                                aria-label="Message STRAB"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="w-9 h-9 flex items-center justify-center bg-primary text-black rounded-xl disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all shrink-0 shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
                                aria-label="Send"
                            >
                                {isLoading
                                    ? <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    : <Send size={13} strokeWidth={2.5} />
                                }
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-white/20 mt-2 max-w-md mx-auto leading-relaxed">
                            <span className="text-primary/80 font-semibold">Strategy hub</span> — new workspaces here. Existing projects: <span className="text-white/35">Dashboard → Project STRAB</span> on the card.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
