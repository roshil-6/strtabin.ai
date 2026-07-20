import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Calendar, CheckSquare, Home, Clock, Bot, Code2 } from 'lucide-react';

interface MobileNavProps {
    canvasId: string;
}

/** Fixed bottom navigation bar — shown only on mobile (md:hidden). */
export default function MobileNav({ canvasId }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const workspaceId = (location.state as { workspaceId?: number })?.workspaceId;
    const homePath = workspaceId ? `/workspace/${workspaceId}` : '/dashboard';

    const items = [
        { label: workspaceId ? 'Home' : 'Home', icon: Home, path: homePath, action: () => navigate(homePath), exact: true },
        { label: 'Canvas',   icon: Layout,       path: `/strategy/${canvasId}`,  action: () => navigate(`/strategy/${canvasId}`, { state: location.state })              },
        { label: 'Tasks',    icon: CheckSquare,  path: `/todo/${canvasId}`,      action: () => navigate(`/todo/${canvasId}`, { state: location.state })                  },
        { label: 'Calendar', icon: Calendar,     path: `/calendar/${canvasId}`,  action: () => navigate(`/calendar/${canvasId}`, { state: location.state })              },
        { label: 'Timeline', icon: Clock,        path: `/timeline/${canvasId}`,  action: () => navigate(`/timeline/${canvasId}`, { state: location.state })              },
        { label: 'Code',     icon: Code2,        path: `/code/${canvasId}`,      action: () => navigate(`/code/${canvasId}`, { state: location.state })                  },
        { label: 'AI',       icon: Bot,          path: `/strab/${canvasId}`,     action: () => navigate(`/strab/${canvasId}`, { state: location.state }), isAI: true, title: 'Project STRAB — chat & reports' },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50"
            style={{
                background: 'rgba(10,10,10,0.96)',
                backdropFilter: 'blur(32px) saturate(200%)',
                WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.04) inset',
            }}
            aria-label="Mobile project navigation"
        >
            <div className="flex items-stretch h-[60px] px-1">
                {items.map(({ label, icon: Icon, path, action, exact, isAI, title }) => {
                    const active = exact
                        ? location.pathname === path
                        : location.pathname.startsWith(path.split('?')[0]);
                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={action}
                            title={title}
                            className="flex-1 flex flex-col items-center justify-center gap-[3px] min-w-0 relative active:scale-90 transition-transform duration-150"
                            aria-label={title || label}
                            aria-current={active ? 'page' : undefined}
                        >
                            {/* Active pill background */}
                            {active && (
                                <div
                                    className="absolute inset-x-1.5 inset-y-1 rounded-2xl"
                                    style={{
                                        background: isAI
                                            ? 'rgba(249,115,22,0.12)'
                                            : 'rgba(255,255,255,0.06)',
                                        border: isAI
                                            ? '1px solid rgba(249,115,22,0.25)'
                                            : '1px solid rgba(255,255,255,0.06)',
                                    }}
                                />
                            )}

                            {/* Icon */}
                            <div className="relative z-10">
                                <Icon
                                    size={20}
                                    style={{
                                        color: active
                                            ? (isAI ? '#f97316' : '#ffffff')
                                            : 'rgba(255,255,255,0.25)',
                                        transition: 'color 0.2s',
                                    }}
                                    strokeWidth={active ? 2.2 : 1.6}
                                />
                                {/* AI live dot */}
                                {isAI && (
                                    <div
                                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400"
                                        style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }}
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className="relative z-10 text-[8.5px] font-black tracking-wider leading-none"
                                style={{
                                    color: active
                                        ? (isAI ? '#f97316' : 'rgba(255,255,255,0.9)')
                                        : 'rgba(255,255,255,0.2)',
                                    transition: 'color 0.2s',
                                }}
                            >
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Safe area spacer */}
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'rgba(10,10,10,0.96)' }} />
        </nav>
    );
}
