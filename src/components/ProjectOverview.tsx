import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';

import { FileText, CheckSquare, LineChart, Bot, Layout, Activity, Zap, Sparkles, Network } from 'lucide-react';

export default function ProjectOverview() {
    const { id } = useParams<{ id: string }>();

    const navigate = useNavigate();
    const location = useLocation();
    const { canvases } = useStore();
    
    const project = id ? canvases[id] : null;

    useEffect(() => {
        if (!project && id) {
            navigate('/dashboard', { replace: true });
        }
    }, [project, id, navigate]);

    if (!project) return null;

    const todoCount = project.todos?.length || 0;
    const completedTodos = project.todos?.filter((t: { completed: boolean }) => t.completed).length || 0;
    const wordCount = (project.writingContent || '').trim().split(/\s+/).filter(Boolean).length;
    const completionRate = todoCount > 0 ? Math.round((completedTodos / todoCount) * 100) : 0;

    const tools = [
        { label: 'Writing', icon: FileText, path: `/strategy/${id}` },
        { label: 'Flow', icon: Network, path: `/strategy/${id}?view=flow` },
        { label: 'Tasks', icon: CheckSquare, path: `/todo/${id}` },
        { label: 'Timeline', icon: LineChart, path: `/timeline/${id}` },
        { label: 'AI', icon: Bot, path: `/ai/${id}` },
    ];

    return (
        <div className="min-h-[100dvh] theme-page flex flex-col relative overflow-y-auto">
            <div className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full space-y-12">
                
                {/* Project tools Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Layout className="text-primary" size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[var(--text)] tracking-tight">Project tools</h2>
                            <p className="text-[var(--text-muted)] text-sm">Open your project tools.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {tools.map(({ label, icon: Icon, path }) => (
                            <button key={label} onClick={() => navigate(path, { state: location.state })}
                                className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] hover:bg-[var(--input-bg)] text-[var(--text)]">
                                <Icon size={20} /><span>{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* AI Brain Callout */}
                    <div 
                        onClick={() => navigate(`/ai/${id}`, { state: location.state })}
                        className="mt-2 p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-4 cursor-pointer hover:bg-violet-500/10 hover:border-violet-500/20 transition-all group relative overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                            <Sparkles className="text-violet-400 group-hover:animate-pulse" size={16} />
                        </div>
                        <div>
                            <h3 className="text-violet-300 font-bold mb-1">Use your own AI</h3>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-3xl">
                                Prepare your project context for ChatGPT, Claude, or Gemini, then bring the response back into your project.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4 relative z-10">
                                {['Choose your AI', 'Select project context', 'Save responses', 'No API keys'].map(pill => (
                                    <span key={pill} className="px-3 py-1.5 rounded-full bg-[var(--input-bg)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1.5 group-hover:bg-[var(--border)] transition-colors">
                                        <Zap size={10} className="text-violet-400" />
                                        {pill}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        {/* Go to chat indicator */}
                        <div className="ml-auto flex flex-col justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                                <Bot size={18} className="text-violet-300" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Dashboard Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Performance / Completion */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-1 p-6 rounded-3xl premium-card flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[var(--text-muted)] font-medium text-sm">Performance</h3>
                                <Activity size={16} className="text-primary/70" />
                            </div>
                            <div className="text-3xl font-black text-[var(--text)]">{completionRate}%</div>
                            <div className="text-[var(--text-muted)] text-xs mt-1">Project completion</div>
                        </div>
                        <div className="mt-6">
                            <div className="h-2 w-full rounded-full bg-[var(--input-bg)] overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${completionRate}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="col-span-1 lg:col-span-1 p-6 rounded-3xl premium-card grid grid-cols-2 gap-4">
                        <div className="flex flex-col justify-center">
                            <div className="text-[var(--text-muted)] text-xs font-semibold mb-1 uppercase tracking-wider">Words</div>
                            <div className="text-2xl font-black text-[var(--text)]">{wordCount}</div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="text-[var(--text-muted)] text-xs font-semibold mb-1 uppercase tracking-wider">Tasks</div>
                            <div className="text-2xl font-black text-[var(--text)]">{completedTodos} / {todoCount}</div>
                        </div>
                    </div>

                    {/* Active Tasks Preview */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 p-6 rounded-3xl premium-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[var(--text-secondary)] font-bold">Active Tasks</h3>
                            <button onClick={() => navigate(`/todo/${id}`)} className="text-primary text-xs font-semibold hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                            {project.todos?.slice(0, 3).map((task: { id: string; text: string; completed: boolean }) => (
                                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${task.completed ? 'bg-primary/20 border-primary text-primary' : 'border-white/20'}`}>
                                        {task.completed && <CheckSquare size={12} />}
                                    </div>
                                    <div className={`text-sm ${task.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>
                                        {task.text}
                                    </div>
                                </div>
                            ))}
                            {(!project.todos || project.todos.length === 0) && (
                                <div className="text-center p-4 text-[var(--text-muted)] text-sm">No tasks created yet</div>
                            )}
                        </div>
                    </div>
                </section>
                
            </div>
        </div>
    );
}
