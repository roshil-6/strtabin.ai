import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, Target, Map, CheckSquare, Code2, LineChart, Bot, Layout, Activity, Zap, Sparkles } from 'lucide-react';

const colorMap: Record<string, any> = {
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50', iconBg: 'bg-purple-500/20', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]', indicator: 'bg-purple-500' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50', iconBg: 'bg-blue-500/20', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]', indicator: 'bg-blue-500' },
    green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/50', iconBg: 'bg-green-500/20', glow: 'shadow-[0_0_30px_rgba(34,197,164,0.15)]', indicator: 'bg-green-500' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/50', iconBg: 'bg-orange-500/20', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]', indicator: 'bg-orange-500' },
    pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/50', iconBg: 'bg-pink-500/20', glow: 'shadow-[0_0_30px_rgba(236,72,153,0.15)]', indicator: 'bg-pink-500' },
    teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/50', iconBg: 'bg-teal-500/20', glow: 'shadow-[0_0_30px_rgba(20,184,166,0.15)]', indicator: 'bg-teal-500' }
};

const FlowNode = ({ 
    step, 
    label, 
    description, 
    icon: Icon, 
    color, 
    isActive,
    onClick,
    isLast 
}: any) => {
    const theme = colorMap[color];
    
    return (
        <div className="flex items-center">
            <div 
                onClick={onClick}
                className={`group relative flex flex-col items-center gap-2 md:gap-3 w-[95px] md:w-[140px] p-2 md:p-4 rounded-2xl border transition-all cursor-pointer active:scale-95
                    ${isActive ? `${theme.border} ${theme.bg} ${theme.glow}` : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}
                `}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest ${isActive ? theme.text : 'text-white/30'}`}>
                    {step}
                </div>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all
                    ${isActive ? `${theme.iconBg} ${theme.border}` : 'bg-white/5 border-white/10 group-hover:bg-white/10'}
                `}>
                    <Icon size={20} className={isActive ? theme.text : 'text-white/50 group-hover:text-white/80'} />
                </div>
                <div className="text-center">
                    <div className={`text-xs md:text-sm font-bold mb-0.5 md:mb-1 ${isActive ? 'text-white' : 'text-white/80'}`}>{label}</div>
                    <div className="text-[9px] md:text-[10px] text-white/40 leading-tight px-1 hidden md:block">{description}</div>
                </div>

                {/* Glowing active indicator */}
                {isActive && (
                    <div className={`absolute -bottom-2 w-1/2 h-1 rounded-full ${theme.indicator} shadow-[0_0_10px_currentColor]`} />
                )}
            </div>

            {/* Connecting Line */}
            {!isLast && (
                <div className="w-6 md:w-12 h-[2px] bg-white/10 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/20" />
                </div>
            )}
        </div>
    );
};

export default function ProjectOverview() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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
    const nodeCount = project.nodes?.length || 0;
    const completionRate = todoCount > 0 ? Math.round((completedTodos / todoCount) * 100) : 0;

    const flowSteps = [
        { id: 'goal', step: '01', label: 'Goal', description: 'Set your target and metrics', icon: Target, color: 'purple', path: `/strategy/${id}` },
        { id: 'plan', step: '02', label: 'Plan', description: 'Map out your strategy', icon: Map, color: 'blue', path: `/strategy/${id}` },
        { id: 'tasks', step: '03', label: 'Tasks', description: 'Break into actionable items', icon: CheckSquare, color: 'green', path: `/todo/${id}` },
        { id: 'execute', step: '04', label: 'Execute', description: 'Write code and build', icon: Code2, color: 'orange', path: `/code/${id}` },
        { id: 'track', step: '05', label: 'Track', description: 'Monitor progress', icon: LineChart, color: 'pink', path: `/timeline/${id}` },
        { id: 'grow', step: '06', label: 'Grow', description: 'AI insights and reflection', icon: Bot, color: 'teal', path: `/strab/${id}` },
    ];

    return (
        <div className="min-h-screen theme-page flex flex-col relative overflow-y-auto">
            {/* Top Navigation */}
            <div className="h-16 flex items-center px-6 border-b border-white/[0.04] shrink-0 sticky top-0 z-20 backdrop-blur-xl bg-[var(--bg-page)]/80">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span className="text-sm font-semibold">Back to Dashboard</span>
                </button>
                <div className="w-px h-6 bg-white/10 mx-6" />
                <h1 className="text-xl font-bold text-white tracking-tight">{project.name || 'Untitled Project'}</h1>
            </div>

            <div className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full space-y-12">
                
                {/* Flow Builder Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Layout className="text-primary" size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Flow Builder</h2>
                            <p className="text-white/40 text-sm">Navigate your project lifecycle. AI will handle the execution.</p>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
                        <div className="flex items-center min-w-max">
                            {flowSteps.map((step, idx) => (
                                <FlowNode 
                                    key={step.id}
                                    {...step}
                                    isActive={false} // You could set this based on active project state
                                    isLast={idx === flowSteps.length - 1}
                                    onClick={() => navigate(step.path)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* AI Brain Callout */}
                    <div 
                        onClick={() => navigate(`/strab/${id}`)}
                        className="mt-2 p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-4 cursor-pointer hover:bg-violet-500/10 hover:border-violet-500/20 transition-all group relative overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                            <Sparkles className="text-violet-400 group-hover:animate-pulse" size={16} />
                        </div>
                        <div>
                            <h3 className="text-violet-300 font-bold mb-1">AI Brain</h3>
                            <p className="text-white/60 text-sm leading-relaxed max-w-3xl">
                                I will break down your flow, create tasks, set deadlines, remind you, suggest improvements, and help you achieve your goal.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4 relative z-10">
                                {['Smart Suggestions', 'Auto Scheduling', 'Progress Insights', 'Adaptive Support'].map(pill => (
                                    <span key={pill} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/50 flex items-center gap-1.5 group-hover:bg-white/10 transition-colors">
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
                                <h3 className="text-white/60 font-medium text-sm">Performance</h3>
                                <Activity size={16} className="text-primary/70" />
                            </div>
                            <div className="text-3xl font-black text-white">{completionRate}%</div>
                            <div className="text-white/30 text-xs mt-1">Project completion</div>
                        </div>
                        <div className="mt-6">
                            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${completionRate}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="col-span-1 lg:col-span-1 p-6 rounded-3xl premium-card grid grid-cols-2 gap-4">
                        <div className="flex flex-col justify-center">
                            <div className="text-white/50 text-xs font-semibold mb-1 uppercase tracking-wider">Nodes</div>
                            <div className="text-2xl font-black text-white">{nodeCount}</div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="text-white/50 text-xs font-semibold mb-1 uppercase tracking-wider">Tasks</div>
                            <div className="text-2xl font-black text-white">{completedTodos} / {todoCount}</div>
                        </div>
                    </div>

                    {/* Active Tasks Preview */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 p-6 rounded-3xl premium-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/80 font-bold">Active Tasks</h3>
                            <button onClick={() => navigate(`/todo/${id}`)} className="text-primary text-xs font-semibold hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                            {project.todos?.slice(0, 3).map((task: { id: string; text: string; completed: boolean }) => (
                                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${task.completed ? 'bg-primary/20 border-primary text-primary' : 'border-white/20'}`}>
                                        {task.completed && <CheckSquare size={12} />}
                                    </div>
                                    <div className={`text-sm ${task.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                        {task.text}
                                    </div>
                                </div>
                            ))}
                            {(!project.todos || project.todos.length === 0) && (
                                <div className="text-center p-4 text-white/30 text-sm">No tasks created yet</div>
                            )}
                        </div>
                    </div>
                </section>
                
            </div>
        </div>
    );
}
