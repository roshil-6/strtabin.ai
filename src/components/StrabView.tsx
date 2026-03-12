import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { sendStrabMessageStreaming, type ChatMessage } from '../services/strabService';
import { serverWarmup } from '../services/serverWarmup';
import { Network, Send, Sparkles, ArrowLeft, Trash2 } from 'lucide-react';
import MobileNav from './MobileNav';

export default function StrabView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const canvas = useStore(state => state.canvases[id || '']);
    const addChatMessage = useStore(state => state.addChatMessage);
    const updateLastChatMessage = useStore(state => state.updateLastChatMessage);
    const clearChatHistory = useStore(state => state.clearChatHistory);
    const chatHistoryMap = useStore(state => state.chatHistory);
    const chatHistory = useMemo(() => chatHistoryMap[id || ''] || [], [chatHistoryMap, id]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        };
    }, [resolvedName, canvas]);

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
                    setIsLoading(true);
                    addChatMessage(id!, { role: 'assistant', content: '' });
                    try {
                        const token = await getToken();
                        await sendStrabMessageStreaming(
                            chatHistory,
                            projectContext,
                            (text) => updateLastChatMessage(id!, text),
                            token ?? undefined,
                        );
                    } catch {
                        toast.error('STRAB is unreachable. Please try again.');
                    } finally {
                        setIsLoading(false);
                    }
                };
                triggerAi();
            }
        }
    }, [id, chatHistory, isLoading, projectContext, addChatMessage, updateLastChatMessage, getToken]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: message };
        addChatMessage(id!, userMsg);
        addChatMessage(id!, { role: 'assistant', content: '' });
        setIsLoading(true);

        try {
            const token = await getToken();
            const messagesForApi = [...chatHistory, userMsg];
            await sendStrabMessageStreaming(
                messagesForApi,
                projectContext,
                (text) => updateLastChatMessage(id!, text),
                token ?? undefined,
            );
        } catch {
            toast.error('STRAB is unreachable. Please try again.');
            updateLastChatMessage(id!, "I'm having trouble connecting right now. Please try again in a moment.");
        } finally {
            setIsLoading(false);
        }
    }, [id, chatHistory, projectContext, addChatMessage, updateLastChatMessage, getToken, isLoading]);

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

                <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
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
                                if (msg.role === 'assistant' && msg.content.includes('```json')) {
                                    try {
                                        const jsonStr = msg.content.split('```json')[1].split('```')[0].trim();
                                        const parsed = JSON.parse(jsonStr);
                                        if (parsed?.type === 'clarification' && Array.isArray(parsed?.options)) {
                                            parsedJson = parsed;
                                            isInteractive = true;
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
                                                                className="text-left px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-white/20 hover:bg-[#222] transition-colors text-white/80 hover:text-white"
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap">
                                                    {msg.content.replace(/```json[\s\S]*```/, '')}
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
                        <div className="px-3 pt-2.5 pb-2 flex gap-2 overflow-x-auto custom-scrollbar-hide border-t border-white/[0.06]">
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

                        {/* Input Area — pb-[68px] compensates for fixed MobileNav on mobile */}
                        <div className="px-2 md:px-3 py-2 md:py-3 pb-[68px] md:pb-3 theme-panel border-t border-white/[0.03]">
                            <div className="relative max-w-3xl mx-auto">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                    placeholder="Ask STRAB anything…"
                                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3 md:py-3.5 pl-4 pr-12 text-sm md:text-base text-white focus:border-primary/30 focus:bg-white/[0.06] outline-none transition-all placeholder-white/15"
                                    aria-label="Message STRAB"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-primary text-black rounded-xl disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all"
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
                                    <div className="text-[11px] text-white/30 mt-1">{canvas.nodes.length} nodes · {canvas.edges.length} connections</div>
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
                                        { label: 'Canvas nodes', ok: canvas.nodes.length > 0, value: `${canvas.nodes.length} nodes` },
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
