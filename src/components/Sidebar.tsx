import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Calendar, CheckSquare, Home } from 'lucide-react';

export default function Sidebar({ canvasId }: { canvasId?: string }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to determine active state
    const isActive = (path: string) => location.pathname.includes(path);

    if (!canvasId) return null;

    return (
        <div className="w-16 h-full bg-[#0b0b0b] border-r border-white/5 flex flex-col items-center py-6 gap-6 z-50">
            {/* Home Button */}
            <button
                onClick={() => navigate('/dashboard')}
                className="group relative p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all shadow-[0_0_15px_rgba(218,119,86,0.15)] hover:shadow-[0_0_20px_rgba(218,119,86,0.3)]"
            >
                <Home size={20} className="group-hover:scale-110 transition-transform" />
                {/* Tooltip */}
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    General Projects
                </div>
            </button>

            <div className="w-8 h-[1px] bg-white/5" />

            {/* Project Tools */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate(`/strategy/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/strategy')
                        ? 'bg-primary text-black'
                        : 'text-white/30 hover:text-white hover:bg-white/5'
                        }`}
                    title="Strategy Board"
                >
                    <Layout size={20} />
                </button>

                <button
                    onClick={() => navigate(`/timeline/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/timeline')
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-white/30 hover:text-blue-400 hover:bg-white/5'
                        }`}
                    title="Timeline"
                >
                    <Calendar size={20} />
                </button>

                <button
                    onClick={() => navigate(`/todo/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/todo')
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-white/30 hover:text-orange-400 hover:bg-white/5'
                        }`}
                    title="To-Do List"
                >
                    <CheckSquare size={20} />
                </button>

                <div className="w-8 h-[1px] bg-white/5" />

                <button
                    onClick={() => navigate(`/strab/${canvasId}`)}
                    className={`p-3 rounded-xl transition-all ${isActive('/strab')
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-white/30 hover:text-orange-400 hover:bg-white/5'
                        }`}
                    title="STRAB AI"
                >
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">AI</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
