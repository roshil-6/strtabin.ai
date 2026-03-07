import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Calendar, CheckSquare, Home, Clock, CheckCircle2 } from 'lucide-react';

/** Desktop-only left icon sidebar. Hidden on mobile — each view provides its own bottom nav. */
export default function Sidebar({ canvasId }: { canvasId?: string }) {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname.includes(path);

    if (!canvasId) return null;

    return (
        <nav
            className="hidden md:flex w-16 h-full bg-[#0b0b0b] border-r border-white/5 flex-col items-center py-6 gap-6 z-50"
            aria-label="Project navigation"
        >
            {/* Home Button */}
            <button
                onClick={() => navigate('/dashboard')}
                className="group relative p-3 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all border border-white/5 hover:border-white/10"
                aria-label="Back to dashboard"
            >
                <Home size={20} className="group-hover:scale-105 transition-transform" />
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    General Projects
                </div>
            </button>

            <div className="w-8 h-[1px] bg-white/5" />

            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate(`/strategy/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/strategy')
                        ? 'bg-primary text-black'
                        : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    aria-label="Strategy Board"
                    title="Strategy Board"
                >
                    <Layout size={20} />
                </button>

                <button
                    onClick={() => navigate(`/timeline/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/timeline')
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-white/30 hover:text-blue-400 hover:bg-white/5'}`}
                    aria-label="Timeline"
                    title="Timeline"
                >
                    <Clock size={20} />
                </button>

                <button
                    onClick={() => navigate(`/calendar/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all border ${isActive('/calendar') && !location.search.includes('mode=week')
                        ? 'bg-white text-black border-white'
                        : 'text-white/30 border-transparent hover:text-white hover:bg-white/5'}`}
                    aria-label="Project Calendar"
                    title="Project Calendar"
                >
                    <Calendar size={20} />
                </button>

                <button
                    onClick={() => navigate(`/calendar/${canvasId}?mode=week`)}
                    className={`p-3 rounded-xl transition-all border ${location.search.includes('mode=week')
                        ? 'bg-white text-black border-white'
                        : 'text-white/30 border-transparent hover:text-white hover:bg-white/5'}`}
                    aria-label="Weekly Planner"
                    title="Weekly Planner"
                >
                    <CheckCircle2 size={20} />
                </button>

                <button
                    onClick={() => navigate(`/todo/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/todo')
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-white/30 hover:text-orange-400 hover:bg-white/5'}`}
                    aria-label="To-Do List"
                    title="To-Do List"
                >
                    <CheckSquare size={20} />
                </button>

                <div className="w-8 h-[1px] bg-white/5" />

                <button
                    onClick={() => navigate(`/strab/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/strab')
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-white/30 hover:text-orange-400 hover:bg-white/5'}`}
                    aria-label="STRAB AI Assistant"
                    title="STRAB AI"
                >
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">AI</span>
                    </div>
                </button>
            </div>
        </nav>
    );
}
