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
                {/* Scrollable content — pb-24 on mobile so content clears the bottom nav */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 pb-24 md:pb-12 w-full max-w-4xl mx-auto">
                    <form onSubmit={handleAdd} className="flex gap-3 mb-6">
                        <input
                            type="text"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value.slice(0, MAX_TODO_LENGTH))}
                            placeholder="Add a new task..."
                            maxLength={MAX_TODO_LENGTH}
                            aria-label="New task"
                            className="flex-1 bg-[#151515] border border-white/10 rounded-xl px-4 py-4 text-base outline-none focus:border-orange-400/50 transition-colors placeholder-white/20"
                        />
                        <button
                            type="submit"
                            className="bg-orange-400 text-black font-bold px-6 py-4 rounded-xl hover:bg-orange-500 transition-colors shrink-0 min-h-[54px]"
                        >
                            Add
                        </button>
                    </form>

                    <div className="space-y-3">
                        {(!canvas.todos || canvas.todos.length === 0) && (
                            <div className="text-center text-white/20 py-16 text-sm">No tasks yet — get started!</div>
                        )}

                        {canvas.todos?.map(todo => (
                            <div
                                key={todo.id}
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${todo.completed
                                    ? 'bg-[#151515]/50 border-white/5 opacity-50'
                                    : 'bg-[#151515] border-white/10'
                                    }`}
                            >
                                {/* Toggle — min 44px touch target */}
                                <button
                                    onClick={() => toggleTodo(id!, todo.id)}
                                    className={`p-2 -ml-1 rounded-lg transition-colors ${todo.completed ? 'text-orange-400' : 'text-white/30 hover:text-orange-400'}`}
                                    aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                >
                                    {todo.completed ? <CheckSquare size={22} /> : <Square size={22} />}
                                </button>
                                <span className={`flex-1 text-base leading-snug ${todo.completed ? 'line-through text-white/30' : 'text-white/90'}`}>
                                    {todo.text}
                                </span>
                                <button
                                    onClick={() => deleteTodo(id!, todo.id)}
                                    className="p-2.5 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    aria-label="Delete task"
                                >
                                    <Trash2 size={18} />
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
