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
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/98 backdrop-blur-2xl border-t border-white/[0.06]"
            aria-label="Mobile project navigation"
        >
            <div className="flex items-stretch h-[60px]">
                {items.map(({ label, icon: Icon, path, action, exact }) => {
                    const active = exact
                        ? location.pathname === path
                        : location.pathname.startsWith(path.split('?')[0]);
                    return (
                        <button
                            key={label}
                            onClick={action}
                            className="flex-1 flex flex-col items-center justify-center gap-[5px] min-w-0 relative active:opacity-60 transition-opacity"
                            aria-label={label}
                            aria-current={active ? 'page' : undefined}
                        >
                            {/* Active indicator bar at top */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full transition-all duration-300 ${
                                active ? 'w-6 bg-primary' : 'w-0 bg-transparent'
                            }`} />

                            {/* Icon with subtle active background */}
                            <div className={`rounded-xl p-1.5 transition-all duration-200 ${
                                active
                                    ? label === 'STRAB' ? 'bg-primary/15' : 'bg-white/8'
                                    : ''
                            }`}>
                                <Icon
                                    size={18}
                                    className={`transition-colors duration-200 ${
                                        active
                                            ? label === 'STRAB' ? 'text-primary' : 'text-white'
                                            : 'text-white/30'
                                    }`}
                                    strokeWidth={active ? 2.5 : 1.5}
                                />
                            </div>

                            {/* Label */}
                            <span className={`text-[9px] font-semibold tracking-wide leading-none truncate w-full text-center px-0.5 transition-colors duration-200 ${
                                active
                                    ? label === 'STRAB' ? 'text-primary' : 'text-white/80'
                                    : 'text-white/25'
                            }`}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* iOS home indicator safe area */}
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} className="bg-[#0a0a0a]/98" />
        </nav>
    );
}
