import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import useModalStore from '../store/useModalStore';
import { ChevronLeft, FileCode, Plus, Trash2, Download, Code2, Play, Terminal, X, Loader2, Bot, Send } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { API_BASE_URL } from '../constants';
import { sendGeneralStrabMessage, type ChatMessage } from '../services/strabService';
import MarkdownRenderer from './MarkdownRenderer';
import MobileNav from './MobileNav';

export default function CodeSection() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const store = useStore();
    const canvas = id ? store.canvases[id] : null;

    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [runOutput, setRunOutput] = useState<{ stdout: string; stderr: string; code: number } | null>(null);
    const [showTerminal, setShowTerminal] = useState(false);
    const [showDebugger, setShowDebugger] = useState(false);
    const [debugMessages, setDebugMessages] = useState<ChatMessage[]>([]);
    const [debugInput, setDebugInput] = useState('');
    const [isDebugging, setIsDebugging] = useState(false);
    
    // Ensure canvas exists
    useEffect(() => {
        if (id) {
            store.ensureCanvasExists(id);
        }
    }, [id, store]);

    const codeFiles = canvas?.codeFiles || [];

    // Auto-select first file if none active
    useEffect(() => {
        if (!activeFileId && codeFiles.length > 0) {
            setActiveFileId(codeFiles[0].id);
        } else if (codeFiles.length === 0) {
            setActiveFileId(null);
        }
    }, [codeFiles, activeFileId]);

    const activeFile = codeFiles.find(f => f.id === activeFileId);

    const handleCreateFile = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !newFileName.trim()) return;
        
        let filename = newFileName.trim();
        let ext = filename.split('.').pop()?.toLowerCase();
        
        // Auto-append .py if no extension
        if (!filename.includes('.')) {
            filename += '.py';
            ext = 'py';
        }

        const language = getLanguageFromExt(ext || 'py');
        const newId = store.addCodeFile(id, filename, language);
        setActiveFileId(newId);
        setNewFileName('');
        setIsCreating(false);
    };

    const handleEditorChange = (value: string | undefined) => {
        if (!id || !activeFileId || value === undefined) return;
        store.updateCodeFile(id, activeFileId, value);
    };

    const handleDelete = async (fileId: string) => {
        if (!id) return;
        const confirmed = await useModalStore.getState().confirm('Are you sure you want to delete this file?');
        if (confirmed) {
            store.deleteCodeFile(id, fileId);
            if (activeFileId === fileId) setActiveFileId(null);
        }
    };

    const handleDownload = () => {
        if (!activeFile) return;
        const blob = new Blob([activeFile.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRun = async () => {
        if (!activeFile) return;
        setIsExecuting(true);
        setShowTerminal(true);
        setRunOutput({ stdout: 'Executing...', stderr: '', code: 0 });
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: activeFile.language,
                    files: [activeFile]
                })
            });
            const data = await res.json();
            if (res.ok && data.run) {
                setRunOutput(data.run);
            } else {
                setRunOutput({ stdout: '', stderr: data.error || 'Execution failed', code: 1 });
            }
        } catch (err) {
            setRunOutput({ stdout: '', stderr: 'Network error. Could not reach execution server.', code: 1 });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSendDebug = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!debugInput.trim() && !activeFile) return;
        
        const userMsg = debugInput.trim() || `Please review my code in ${activeFile?.name} and check for any errors.`;
        
        const contextMsg = `I am debugging my code. Here is my current context:\nFile: ${activeFile?.name}\nLanguage: ${activeFile?.language}\nCode:\n\`\`\`\n${activeFile?.content}\n\`\`\`\n\nTerminal Output:\n\`\`\`\n${runOutput ? JSON.stringify(runOutput) : 'No output yet'}\n\`\`\`\n\n`;
        
        const newMessages: ChatMessage[] = [
            ...debugMessages, 
            { role: 'user', content: debugMessages.length === 0 ? contextMsg + userMsg : userMsg }
        ];
        
        setDebugMessages([...newMessages, { role: 'assistant', content: '' }]);
        setDebugInput('');
        setIsDebugging(true);
        
        try {
            await sendGeneralStrabMessage(newMessages, (chunk) => {
                setDebugMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].content = chunk;
                    return updated;
                });
            }, undefined, undefined, 'anthropic');
        } catch (err) {
            setDebugMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1].content = 'Error communicating with AI debugger.';
                return updated;
            });
        } finally {
            setIsDebugging(false);
        }
    };

    if (!canvas) return null;

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#080808] text-white pb-[62px] md:pb-0">
            {/* Sidebar */}
            <div className="hidden md:flex w-64 border-r border-white/10 flex-col bg-[#0e0e0e] shrink-0">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <button 
                        onClick={() => {
                            const state = location.state as { workspaceId?: number } | null;
                            if (state?.workspaceId) {
                                navigate(`/workspace/${state.workspaceId}`);
                            } else {
                                navigate('/dashboard');
                            }
                        }}
                        className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft size={18} />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>
                
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <Code2 size={18} />
                        <span className="font-bold text-sm">Code Editor</span>
                    </div>
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70"
                        title="New File"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    {isCreating && (
                        <form onSubmit={handleCreateFile} className="mb-2 px-2">
                            <input
                                autoFocus
                                type="text"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onBlur={() => setIsCreating(false)}
                                placeholder="script.py"
                                className="w-full bg-white/5 border border-primary/40 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                            />
                        </form>
                    )}
                    
                    {codeFiles.map(file => (
                        <div 
                            key={file.id}
                            onClick={() => setActiveFileId(file.id)}
                            className={`flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeFileId === file.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-white/70'}`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileCode size={14} className="shrink-0" />
                                <span className="text-sm truncate">{file.name}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 hover:text-red-400 rounded transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    
                    {codeFiles.length === 0 && !isCreating && (
                        <div className="text-center px-4 py-8 text-white/40 text-sm">
                            No files yet. Click + to create one.
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeFile ? (
                    <>
                        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
                            <div className="flex items-center gap-3">
                                <FileCode size={18} className="text-primary" />
                                <span className="font-semibold text-white/90">{activeFile.name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/50 uppercase tracking-wider">
                                    {activeFile.language}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowDebugger(!showDebugger)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showDebugger ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                                >
                                    <Bot size={14} />
                                    AI Debugger
                                </button>
                                <button
                                    onClick={handleRun}
                                    disabled={isExecuting}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                >
                                    {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-current" />}
                                    Run
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                        </div>
                        <div className={`flex-1 relative ${showTerminal ? 'h-[60%]' : 'h-full'}`}>
                            <Editor
                                height="100%"
                                language={activeFile.language}
                                theme="vs-dark"
                                value={activeFile.content}
                                onChange={handleEditorChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    lineHeight: 24,
                                    padding: { top: 20 },
                                    scrollBeyondLastLine: false,
                                    smoothScrolling: true,
                                    cursorBlinking: "smooth",
                                    cursorSmoothCaretAnimation: "on",
                                    formatOnPaste: true,
                                }}
                            />
                        </div>
                        
                        {/* Terminal Panel */}
                        {showTerminal && (
                            <div className="h-[40%] min-h-[200px] border-t border-white/10 bg-[#050505] flex flex-col">
                                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0a]">
                                    <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-wider">
                                        <Terminal size={14} />
                                        Terminal Output
                                    </div>
                                    <button onClick={() => setShowTerminal(false)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
                                    {runOutput ? (
                                        <>
                                            {runOutput.stdout && <pre className="text-white/80 whitespace-pre-wrap">{runOutput.stdout}</pre>}
                                            {runOutput.stderr && <pre className="text-red-400 whitespace-pre-wrap mt-2">{runOutput.stderr}</pre>}
                                            {runOutput.code !== 0 && runOutput.code !== undefined && !isExecuting && (
                                                <div className="mt-4 text-red-500/80 text-xs">Exited with code {runOutput.code}</div>
                                            )}
                                            {runOutput.code === 0 && !isExecuting && (
                                                <div className="mt-4 text-emerald-500/80 text-xs">Exited successfully</div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-white/30 italic">No output</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30">
                        <Code2 size={48} className="mb-4 opacity-50" />
                        <p>Select or create a file to start coding</p>
                    </div>
                )}
            </div>

            {/* AI Debugger Sidebar */}
            {showDebugger && (
                <div className="w-80 border-l border-white/10 flex flex-col bg-[#0e0e0e]">
                    <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                            <Bot size={16} />
                            AI Debugger
                        </div>
                        <button onClick={() => setShowDebugger(false)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {debugMessages.length === 0 ? (
                            <div className="text-center text-white/40 text-sm mt-10">
                                <Bot size={32} className="mx-auto mb-3 opacity-20" />
                                <p>Ask AI to review your code or debug your latest terminal output.</p>
                                <button 
                                    onClick={() => handleSendDebug()}
                                    className="mt-4 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                                >
                                    Review My Code
                                </button>
                            </div>
                        ) : (
                            debugMessages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`text-xs text-white/40 mb-1 px-1 flex items-center gap-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && <Bot size={10} />}
                                        {msg.role === 'user' ? 'You' : 'AI'}
                                    </div>
                                    <div className={`p-3 rounded-xl max-w-[90%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-50 border border-indigo-500/20 whitespace-pre-wrap' : 'bg-white/5 text-white/90 border border-white/10'}`}>
                                        {msg.role === 'user' ? (
                                            idx === 0 ? (msg.content.split('Terminal Output:')[1] ? msg.content.split('\n\n').pop() : msg.content) : msg.content
                                        ) : (
                                            <MarkdownRenderer content={msg.content} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isDebugging && debugMessages.length > 0 && (
                            <div className="flex items-center gap-2 text-white/40 text-xs px-2">
                                <Loader2 size={12} className="animate-spin" />
                                AI is thinking...
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-white/10 bg-[#0a0a0a]">
                        <form onSubmit={handleSendDebug} className="relative">
                            <input 
                                type="text"
                                value={debugInput}
                                onChange={e => setDebugInput(e.target.value)}
                                placeholder="Ask AI to debug..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-sm outline-none focus:border-indigo-500/50 text-white placeholder-white/30"
                                disabled={isDebugging}
                            />
                            <button 
                                type="submit"
                                disabled={isDebugging || (!debugInput.trim() && debugMessages.length > 0)}
                                className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-white transition-colors disabled:opacity-50"
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {id && <MobileNav canvasId={id} />}
        </div>
    );
}

function getLanguageFromExt(ext: string): string {
    const map: Record<string, string> = {
        'py': 'python',
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'javascript',
        'tsx': 'typescript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'rs': 'rust',
        'go': 'go',
        'sql': 'sql',
        'sh': 'shell',
    };
    return map[ext] || 'plaintext';
}
