import { useParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import ProjectHeader from './ProjectHeader';
import MobileNav from './MobileNav';

export default function TodoSection() {
    const { id } = useParams<{ id: string }>();
    const canvas = useStore(state => state.canvases[id || '']);

    useEffect(() => {
        if (canvas?.name) document.title = `Tasks — ${canvas.name} | Stratabin`;
    }, [canvas?.name]);
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
        <div className="w-screen h-screen bg-[#0b0b0b] text-white flex flex-col">
            <ProjectHeader canvasId={id!} activeTab="tasks" />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 pb-24 md:pb-12 w-full max-w-3xl mx-auto">

                    {/* Add task input */}
                    <form onSubmit={handleAdd} className="flex gap-2.5 mb-5">
                        <input
                            type="text"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value.slice(0, MAX_TODO_LENGTH))}
                            placeholder="Add a new task…"
                            maxLength={MAX_TODO_LENGTH}
                            aria-label="New task"
                            className="flex-1 bg-[#111] border border-white/[0.09] rounded-xl px-4 py-3.5 text-base outline-none focus:border-primary/40 transition-colors placeholder-white/20"
                        />
                        <button
                            type="submit"
                            className="bg-primary text-black font-bold px-5 py-3.5 rounded-xl active:scale-95 transition-all shrink-0"
                        >
                            Add
                        </button>
                    </form>

                    {/* Task list */}
                    <div className="space-y-2">
                        {(!canvas.todos || canvas.todos.length === 0) && (
                            <div className="text-center text-white/15 py-16 text-sm">
                                <div className="text-3xl mb-3">✓</div>
                                No tasks yet — add one above
                            </div>
                        )}

                        {canvas.todos?.map(todo => (
                            <div
                                key={todo.id}
                                className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
                                    todo.completed
                                        ? 'bg-transparent border-white/[0.04] opacity-40'
                                        : 'bg-[#111] border-white/[0.08] active:bg-white/5'
                                }`}
                            >
                                <button
                                    onClick={() => toggleTodo(id!, todo.id)}
                                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${todo.completed ? 'text-primary' : 'text-white/25 hover:text-primary'}`}
                                    aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                >
                                    {todo.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                <span className={`flex-1 text-[15px] leading-snug ${todo.completed ? 'line-through text-white/20' : 'text-white/85'}`}>
                                    {todo.text}
                                </span>
                                <button
                                    onClick={() => deleteTodo(id!, todo.id)}
                                    className="p-2 rounded-xl text-white/15 hover:text-red-400 active:scale-95 transition-all"
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
