import { useParams, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { Trash2, CheckSquare, Square, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import ProjectHeader from './ProjectHeader';
import MobileNav from './MobileNav';

function isDefaultCanvasName(name: string | undefined | null): boolean {
    if (!name || !name.trim()) return true;
    const n = name.trim().toLowerCase();
    return n === 'untitled' || n === 'untitled canvas' || n === 'untitled project' || n === 'shared canvas';
}

export default function TodoSection() {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const canvas = useStore(state => state.canvases[id || '']);
    const projectTitle = (location.state as { projectTitle?: string })?.projectTitle;

    const displayName = (canvas?.name && !isDefaultCanvasName(canvas.name)) ? canvas.name
        : (canvas?.title && !isDefaultCanvasName(canvas.title)) ? canvas.title
        : (projectTitle || canvas?.name || canvas?.title || 'Tasks');
    useEffect(() => {
        document.title = `Tasks — ${displayName} | Stratabin`;
    }, [displayName]);
    const addTodo = useStore(state => state.addCanvasTodo);
    const toggleTodo = useStore(state => state.toggleCanvasTodo);
    const deleteTodo = useStore(state => state.deleteCanvasTodo);

    const [newTodo, setNewTodo] = useState('');

    if (!canvas) return <div className="p-8 text-white">Project not found</div>;

    const MAX_TODO_LENGTH = 200;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTodo.trim();
        if (!trimmed) return;
        if (trimmed.length > MAX_TODO_LENGTH) return;
        const isDuplicate = canvas.todos?.some(t => t.text.toLowerCase() === trimmed.toLowerCase());
        if (isDuplicate) return;
        addTodo(id!, trimmed);
        setNewTodo('');
    };

    return (
        <div className="w-screen h-screen theme-page text-[var(--text)] flex flex-col">
            <ProjectHeader canvasId={id!} activeTab="tasks" />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto py-6 sm:py-8 md:py-12 pb-24 md:pb-12 px-4 sm:px-6 md:px-12 w-full max-w-2xl mx-auto">

                    {/* NotebookLM-style: inline add — minimal, content-first */}
                    <form onSubmit={handleAdd} className="mb-8">
                        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-2 focus-within:border-primary/30 transition-colors">
                            <button
                                type="submit"
                                className="p-2 -ml-2 rounded-full text-[var(--text-muted)] hover:text-primary hover:bg-primary/5 transition-all shrink-0"
                                aria-label="Add task"
                            >
                                <Plus size={20} strokeWidth={2} />
                            </button>
                            <input
                                type="text"
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value.slice(0, MAX_TODO_LENGTH))}
                                placeholder="Add a task…"
                                maxLength={MAX_TODO_LENGTH}
                                aria-label="New task"
                                className="flex-1 bg-transparent text-[15px] md:text-base outline-none placeholder-[var(--text-muted)] min-w-0"
                            />
                        </div>
                    </form>

                    {/* Minimal list — NotebookLM note-style rows */}
                    <div className="space-y-0">
                        {(!canvas.todos || canvas.todos.length === 0) && (
                            <div className="pt-8 text-center">
                                <p className="text-[var(--text-muted)] text-sm">No tasks yet</p>
                                <p className="text-[var(--text-dim)] text-xs mt-1">Type above and press Enter to add one</p>
                            </div>
                        )}

                        {canvas.todos?.map(todo => (
                            <div
                                key={todo.id}
                                className={`group flex items-center gap-3 py-3 px-1 -mx-1 rounded-lg transition-colors ${
                                    todo.completed ? 'opacity-50' : 'hover:bg-[var(--input-bg)]'
                                }`}
                            >
                                <button
                                    onClick={() => toggleTodo(id!, todo.id)}
                                    className={`p-1.5 rounded-full transition-all shrink-0 ${todo.completed ? 'text-primary' : 'text-[var(--text-muted)] hover:text-primary'}`}
                                    aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                    {todo.completed ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
                                </button>
                                <span className={`flex-1 text-[15px] leading-relaxed min-w-0 ${todo.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                                    {todo.text}
                                </span>
                                <button
                                    onClick={() => deleteTodo(id!, todo.id)}
                                    className="p-1.5 rounded-full text-[var(--text-dim)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                    aria-label="Delete task"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {id && <MobileNav canvasId={id} />}
        </div>
    );
}
