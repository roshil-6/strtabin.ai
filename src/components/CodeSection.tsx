import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, FileCode, Plus, Trash2, Download, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function CodeSection() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const store = useStore();
    const canvas = id ? store.canvases[id] : null;

    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    
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

    const activeFile = codeFiles.find((f: any) => f.id === activeFileId);

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

    const handleDelete = (fileId: string) => {
        if (!id) return;
        if (confirm('Are you sure you want to delete this file?')) {
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

    if (!canvas) return null;

    return (
        <div className="flex h-screen w-full bg-[#080808] text-white">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 flex flex-col bg-[#0e0e0e]">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(`/strategy/${id}`)}
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
                    
                    {codeFiles.map((file: any) => (
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
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download size={14} />
                                Download
                            </button>
                        </div>
                        <div className="flex-1 relative">
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
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30">
                        <Code2 size={48} className="mb-4 opacity-50" />
                        <p>Select or create a file to start coding</p>
                    </div>
                )}
            </div>
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
