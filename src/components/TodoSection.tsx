import { useParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import { useState } from 'react';
import ProjectHeader from './ProjectHeader';

export default function TodoSection() {
    const { id } = useParams<{ id: string }>();
    const canvas = useStore(state => state.canvases[id || '']);
    const addTodo = useStore(state => state.addCanvasTodo);
    const toggleTodo = useStore(state => state.toggleCanvasTodo);
    const deleteTodo = useStore(state => state.deleteCanvasTodo);

    const [newTodo, setNewTodo] = useState('');

    if (!canvas) return <div className="p-8 text-white">Project not found</div>;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodo.trim()) {
            addTodo(id!, newTodo);
            setNewTodo('');
        }
    };

    return (
        <div className="w-screen h-screen bg-[#0b0b0b] text-white flex flex-col">
            <ProjectHeader canvasId={id!} activeTab="tasks" />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Removed local header */}

                <div className="flex-1 p-8 sm:p-12 w-full max-w-4xl mx-auto">
                    <form onSubmit={handleAdd} className="flex gap-4 mb-8">
                        <input
                            type="text"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            placeholder="Add a new task..."
                            className="flex-1 bg-[#151515] border border-white/10 rounded-xl px-6 py-4 outline-none focus:border-orange-400/50 transition-colors placeholder-white/20"
                        />
                        <button
                            type="submit"
                            className="bg-orange-400 text-black font-bold px-6 rounded-xl hover:bg-orange-500 transition-colors"
                        >
                            Add
                        </button>
                    </form>

                    <div className="space-y-3">
                        {(!canvas.todos || canvas.todos.length === 0) && (
                            <div className="text-center text-white/20 py-12">No tasks yet. Get started!</div>
                        )}

                        {canvas.todos?.map(todo => (
                            <div
                                key={todo.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${todo.completed
                                    ? 'bg-[#151515]/50 border-white/5 opacity-50'
                                    : 'bg-[#151515] border-white/10'
                                    }`}
                            >
                                <button
                                    onClick={() => toggleTodo(id!, todo.id)}
                                    className={`text-white/50 hover:text-orange-400 transition-colors ${todo.completed ? 'text-orange-400' : ''}`}
                                >
                                    {todo.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                                </button>
                                <span className={`flex-1 text-lg ${todo.completed ? 'line-through text-white/30' : ''}`}>
                                    {todo.text}
                                </span>
                                <button
                                    onClick={() => deleteTodo(id!, todo.id)}
                                    className="text-white/20 hover:text-red-500 transition-colors p-2"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
