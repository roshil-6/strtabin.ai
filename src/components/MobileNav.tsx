import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Calendar, CheckSquare, Home, Clock, Bot } from 'lucide-react';

interface MobileNavProps {
    canvasId: string;
}

/** Fixed bottom navigation bar — shown only on mobile (md:hidden). */
export default function MobileNav({ canvasId }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const items = [
        {
            label: 'Home',
            icon: <Home size={20} />,
            path: '/dashboard',
            action: () => navigate('/dashboard'),
            exact: true,
        },
        {
            label: 'Canvas',
            icon: <Layout size={20} />,
            path: `/strategy/${canvasId}`,
            action: () => navigate(`/strategy/${canvasId}`),
        },
        {
            label: 'Tasks',
            icon: <CheckSquare size={20} />,
            path: `/todo/${canvasId}`,
            action: () => navigate(`/todo/${canvasId}`),
        },
        {
            label: 'Calendar',
            icon: <Calendar size={20} />,
            path: `/calendar/${canvasId}`,
            action: () => navigate(`/calendar/${canvasId}`),
        },
        {
            label: 'Timeline',
            icon: <Clock size={20} />,
            path: `/timeline/${canvasId}`,
            action: () => navigate(`/timeline/${canvasId}`),
        },
        {
            label: 'STRAB',
            icon: <Bot size={20} />,
            path: `/strab/${canvasId}`,
            action: () => navigate(`/strab/${canvasId}`),
        },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b0b0b]/95 border-t border-white/10 backdrop-blur-xl"
            aria-label="Mobile project navigation"
        >
            <div className="flex items-stretch h-16">
                {items.map(({ label, icon, path, action }) => {
                    const active = location.pathname === path ||
                        (label !== 'Home' && location.pathname.startsWith(path.split('?')[0]));
                    return (
                        <button
                            key={label}
                            onClick={action}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 min-w-0
                                ${active
                                    ? 'text-primary'
                                    : 'text-white/30 active:text-white/60'
                                }`}
                            aria-label={label}
                        >
                            <span className={`transition-transform ${active ? 'scale-110' : ''}`}>
                                {icon}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider leading-none truncate w-full text-center px-0.5">
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Safe area spacer for iOS home indicator */}
            <div className="h-safe-bottom bg-[#0b0b0b]/95" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </nav>
    );
}
