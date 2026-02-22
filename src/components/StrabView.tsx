import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { sendStrabMessage, type ChatMessage } from '../services/strabService';
import { Bot, Send, Sparkles, BarChart3, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';

export default function StrabView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[id || '']);
    const addChatMessage = useStore(state => state.addChatMessage);
    const clearChatHistory = useStore(state => state.clearChatHistory);
    // Use stable selector to avoid infinite loop
    const chatHistoryMap = useStore(state => state.chatHistory);
    const chatHistory = chatHistoryMap[id || ''] || [];

    // State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Greeting & Context
    useEffect(() => {
        if (chatHistory.length === 0) {
            addChatMessage(id!, {
                role: 'assistant',
                content: `I am STRAB. I have analyzed **${canvas?.name || 'this project'}**. Ready to assist with reports, insights, or strategy.`
            });
        }
    }, [canvas, id, chatHistory.length, addChatMessage]);

    // Auto-prompt logic for Selection Follow-up
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autoPrompt') === 'true' && !isLoading && chatHistory.length > 0) {
            const lastMsg = chatHistory[chatHistory.length - 1];
            if (lastMsg.role === 'user' && lastMsg.content.includes('Regarding this part:')) {
                // Remove query param to avoid re-triggering
                window.history.replaceState({}, '', window.location.pathname);
                // Trigger AI response
                const triggerAi = async () => {
                    setIsLoading(true);
                    const projectContext = {
                        name: canvas?.name,
                        nodes: canvas?.nodes.length,
                        edges: canvas?.edges.length,
                        todos: canvas?.todos,
                        lastUpdated: new Date(canvas?.updatedAt || Date.now()).toISOString(),
                        nodeLabels: canvas?.nodes.map(n => n.data.label),
                        writingContent: canvas?.writingContent
                    };
                    const responseText = await sendStrabMessage(chatHistory, projectContext);
                    addChatMessage(id!, { role: 'assistant', content: responseText });
                    setIsLoading(false);
                };
                triggerAi();
            }
        }
    }, [id, chatHistory, isLoading, canvas, addChatMessage]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input } as ChatMessage;
        addChatMessage(id!, userMsg);
        setInput('');
        setIsLoading(true);

        const projectContext = {
            name: canvas?.name,
            nodes: canvas?.nodes.length,
            edges: canvas?.edges.length,
            todos: canvas?.todos,
            lastUpdated: new Date(canvas?.updatedAt || Date.now()).toISOString(),
            nodeLabels: canvas?.nodes.map(n => n.data.label),
            writingContent: canvas?.writingContent
        };

        const messagesForApi = [...chatHistory, userMsg];
        const responseText = await sendStrabMessage(messagesForApi, projectContext);

        addChatMessage(id!, { role: 'assistant', content: responseText });
        setIsLoading(false);
    };

    if (!canvas) return <div className="p-10 text-white">Project not found.</div>;

    return (
        <div className="flex flex-col h-screen bg-[#0b0b0b] text-white overflow-hidden relative">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center px-6 bg-[#0b0b0b]/80 backdrop-blur-md z-10 flex-shrink-0">
                <button onClick={() => navigate(-1)} className="mr-4 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        <Bot size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-wide">STRAB <span className="text-white/30 font-normal">AI</span></h1>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Project Intelligence</p>
                    </div>
                </div>

                <div className="ml-auto flex bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => clearChatHistory(id!)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-white/30 hover:text-red-400 hover:bg-white/5 transition-all mr-2"
                        title="Clear Conversation"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        Chat & Insights
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'reports' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        Reports
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex">

                {/* Chat View */}
                {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/10' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {msg.role === 'user' ? <div className="w-2 h-2 bg-white rounded-full" /> : <Sparkles size={14} />}
                                    </div>
                                    <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-white/5 border border-white/10 text-white/90' : 'text-white/80'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-orange-500/20 text-orange-400">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="p-4 text-white/30 text-sm animate-pulse">Thinking...</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/5 bg-[#0b0b0b]">
                            <div className="relative max-w-3xl mx-auto">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask STRAB about your project..."
                                    className="w-full bg-[#151515] border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-orange-400 hover:text-orange-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports View (Mock/Visual for now) */}
                {activeTab === 'reports' && (
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-4 text-white/50">
                                        <BarChart3 size={18} />
                                        <span className="text-xs font-bold uppercase">Progress</span>
                                    </div>
                                    <div className="text-3xl font-bold mb-1">{(canvas?.nodes.length || 0) * 5}%</div>
                                    <div className="text-xs text-white/30">Estimated Completion</div>
                                    <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${(canvas?.nodes.length || 0) * 5}%` }} />
                                    </div>
                                </div>

                                <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-4 text-white/50">
                                        <AlertTriangle size={18} />
                                        <span className="text-xs font-bold uppercase">Bottlenecks</span>
                                    </div>
                                    <div className="text-3xl font-bold mb-1">0</div>
                                    <div className="text-xs text-white/30">Detected Issues</div>
                                </div>

                                <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-4 text-white/50">
                                        <Sparkles size={18} />
                                        <span className="text-xs font-bold uppercase">Optimization</span>
                                    </div>
                                    <div className="text-xl font-bold mb-1 text-indigo-400">High</div>
                                    <div className="text-xs text-white/30">AI Rating</div>
                                </div>
                            </div>

                            <div className="bg-[#151515] border border-white/5 p-6 rounded-2xl">
                                <h3 className="font-bold text-lg mb-4">Executive Summary</h3>
                                <p className="text-sm text-white/60 leading-relaxed">
                                    This project is currently in the <strong>{canvas.nodes.length > 5 ? 'Execution' : 'Planning'}</strong> phase.
                                    STRAB has detected {canvas.nodes.length} active nodes and {canvas.todos?.length || 0} pending tasks.
                                    {canvas.nodes.length === 0 ? "The canvas is currently empty. Consider starting with a brainstorming session." : "Workflow structure looks stable."}
                                </p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => { setActiveTab('chat'); setInput("Generate a detailed report for this project."); handleSend(); }}
                                        className="text-indigo-400 text-xs font-bold uppercase tracking-wider hover:text-indigo-300 transition-colors"
                                    >
                                        Generate Full Report via AI →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
