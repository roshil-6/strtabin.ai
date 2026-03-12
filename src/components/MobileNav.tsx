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
        { label: 'Home',     icon: Home,        path: '/dashboard',              action: () => navigate('/dashboard'),                exact: true  },
        { label: 'Canvas',   icon: Layout,       path: `/strategy/${canvasId}`,  action: () => navigate(`/strategy/${canvasId}`)              },
        { label: 'Tasks',    icon: CheckSquare,  path: `/todo/${canvasId}`,      action: () => navigate(`/todo/${canvasId}`)                  },
        { label: 'Calendar', icon: Calendar,     path: `/calendar/${canvasId}`,  action: () => navigate(`/calendar/${canvasId}`)              },
        { label: 'Timeline', icon: Clock,        path: `/timeline/${canvasId}`,  action: () => navigate(`/timeline/${canvasId}`)              },
        { label: 'STRAB',    icon: Bot,          path: `/strab/${canvasId}`,     action: () => navigate(`/strab/${canvasId}`)                 },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 theme-panel backdrop-blur-2xl border-t border-white/[0.04]"
            aria-label="Mobile project navigation"
        >
            <div className="flex items-stretch h-[62px] px-1">
                {items.map(({ label, icon: Icon, path, action, exact }) => {
                    const active = exact
                        ? location.pathname === path
                        : location.pathname.startsWith(path.split('?')[0]);
                    const isAI = label === 'STRAB';
                    return (
                        <button
                            key={label}
                            onClick={action}
                            className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 relative active:scale-90 transition-all duration-200"
                            aria-label={label}
                            aria-current={active ? 'page' : undefined}
                        >
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full transition-all duration-300 ${
                                active ? 'w-8 h-[2.5px] bg-primary shadow-[0_0_8px_rgba(255,95,31,0.4)]' : 'w-0 h-0'
                            }`} />

                            <div className={`rounded-xl p-1.5 transition-all duration-200 ${
                                active
                                    ? isAI ? 'bg-primary/12' : 'bg-white/[0.08]'
                                    : ''
                            }`}>
                                <Icon
                                    size={19}
                                    className={`transition-colors duration-200 ${
                                        active
                                            ? isAI ? 'text-primary' : 'text-white'
                                            : 'text-white/25'
                                    }`}
                                    strokeWidth={active ? 2.4 : 1.5}
                                />
                            </div>

                            <span className={`text-[9px] font-bold tracking-wider leading-none truncate w-full text-center px-0.5 transition-colors duration-200 ${
                                active
                                    ? isAI ? 'text-primary' : 'text-white/90'
                                    : 'text-white/20'
                            }`}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} className="theme-panel" />
        </nav>
    );
}
