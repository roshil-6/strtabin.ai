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
                onClick={() => navigate('/')}
                className="p-3 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                title="Dashboard"
            >
                <Home size={20} />
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
            </div>
        </div>
    );
}
