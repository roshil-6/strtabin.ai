import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
}

export default function TodoView() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

    const addTask = () => {
        if (newTaskTitle.trim()) {
            setTasks([...tasks, {
                id: Date.now().toString(),
                title: newTaskTitle,
                completed: false,
                priority: newTaskPriority,
            }]);
            setNewTaskTitle('');
        }
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-500 border-red-500/30 bg-red-500/10';
            case 'medium': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
            case 'low': return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
            default: return 'text-secondary border-white/10 bg-white/5';
        }
    };

    return (
        <div className="p-10 w-full h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2 text-white tracking-tight">To-Do List</h1>
                <p className="text-secondary mb-8">Manage your tasks and priorities</p>

                {/* Add Task Form */}
                <div className="bg-[#151515] rounded-2xl p-6 border border-white/10 mb-6">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTask()}
                            placeholder="What needs to be done?"
                            className="flex-1 bg-[#1a1a1a] text-white px-4 py-3 rounded-lg outline-none border border-white/10 focus:border-primary/50"
                        />
                        <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                            className="bg-[#1a1a1a] text-white px-4 py-3 rounded-lg outline-none border border-white/10 focus:border-primary/50"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <button
                            onClick={addTask}
                            className="px-6 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg text-primary transition-all flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Add
                        </button>
                    </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 text-secondary">
                            <p>No tasks yet. Add one to get started!</p>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div
                                key={task.id}
                                className={`bg-[#151515] rounded-xl p-4 border transition-all ${task.completed ? 'border-white/5 opacity-50' : 'border-white/10 hover:border-primary/30'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed
                                                ? 'bg-primary border-primary'
                                                : 'border-white/30 hover:border-primary'
                                            }`}
                                    >
                                        {task.completed && <Check size={14} className="text-black" />}
                                    </button>
                                    <div className="flex-1">
                                        <p className={`text-white ${task.completed ? 'line-through' : ''}`}>
                                            {task.title}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-2 hover:bg-red-500/20 rounded-lg text-secondary hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Stats */}
                {tasks.length > 0 && (
                    <div className="mt-6 flex gap-4 text-sm">
                        <div className="text-secondary">
                            Total: <span className="text-white font-medium">{tasks.length}</span>
                        </div>
                        <div className="text-secondary">
                            Completed: <span className="text-primary font-medium">{tasks.filter(t => t.completed).length}</span>
                        </div>
                        <div className="text-secondary">
                            Remaining: <span className="text-white font-medium">{tasks.filter(t => !t.completed).length}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
