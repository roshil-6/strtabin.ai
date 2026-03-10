import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Trash2, Bot, Clock, FileText, CheckCircle2, Circle, Layout, Bell, BellOff, ArrowLeft, Sparkles } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import useStore from '../store/useStore';
import { NotificationManager } from '../services/NotificationManager';

export default function CalendarView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { calendarEvents, projectCalendarEvents, addCalendarEvent, removeCalendarEvent, toggleCalendarEvent } = useStore();
    const activeCalendarEvents = id ? (projectCalendarEvents[id] || {}) : calendarEvents;
    const viewMode: 'month' | 'week' = searchParams.get('mode') === 'week' ? 'week' : 'month';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);

    const handleEnableReminders = async () => {
        const granted = await NotificationManager.requestPermission();
        setNotifPermission(granted ? 'granted' : 'denied');
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Week calculation
    const getWeekDays = (date: Date) => {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    };

    const weekDays = getWeekDays(currentDate);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const formatKey = (y: number, m: number, d: number) =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const dateToKey = (date: Date) => formatKey(date.getFullYear(), date.getMonth(), date.getDate());

    const todayKey = formatKey(
        new Date().getFullYear(), new Date().getMonth(), new Date().getDate()
    );

    const previousMonth = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month - 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
        }
        setSelectedDateKey(null);
    };

    const nextMonth = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month + 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
        }
        setSelectedDateKey(null);
    };

    const handleDayClick = (key: string) => {
        setSelectedDateKey(prev => (prev === key ? null : key));
        setNewEventTitle('');
        setNewEventTime('');
        setTimeout(() => timeInputRef.current?.focus(), 100);
    };

    const handleAddEvent = () => {
        if (!newEventTitle.trim() || !selectedDateKey) return;

        // If no time is provided, use a default like "All Day" or let the store handle an empty time string
        const finalTime = newEventTime.trim() || "All Day";

        addCalendarEvent(selectedDateKey, finalTime, newEventTitle.trim(), id);
        setNewEventTitle('');
        setNewEventTime('');
        timeInputRef.current?.focus();
    };

    const selectedDateLabel = selectedDateKey
        ? (() => {
            const [y, m, d] = selectedDateKey.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString(undefined, {
                weekday: 'long', month: 'long', day: 'numeric'
            });
        })()
        : null;

    const selectedEvents = selectedDateKey ? (activeCalendarEvents[selectedDateKey] || []) : [];

    useEffect(() => {
        document.title = id ? 'Calendar | Stratabin' : 'Global Calendar | Stratabin';
    }, [id]);

    useEffect(() => {
        if (selectedDateKey) inputRef.current?.focus();
    }, [selectedDateKey]);

    return (
        <div className="w-screen h-screen bg-[#050505] text-white flex overflow-hidden">
            {/* Desktop left nav */}
            {id ? <Sidebar canvasId={id} /> : (
                <div className="hidden md:flex w-16 h-full bg-[#050505] border-r border-white/[0.04] flex-col items-center py-6 gap-6">
                    <button onClick={() => navigate('/dashboard')} className="p-3 rounded-xl bg-white/[0.04] text-white/40 hover:text-white active:scale-95 transition-all border border-white/[0.04]" aria-label="Go to dashboard">
                        <Calendar size={20} />
                    </button>
                </div>
            )}

            {/* Desktop sub-nav */}
            <div className="hidden md:flex w-48 lg:w-56 bg-[#060606] border-r border-white/[0.04] flex-col pt-6 px-4 gap-1.5">
                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/15 mb-4 px-2">Views</h2>

                <button
                    onClick={() => navigate(id ? `/calendar/${id}` : '/calendar')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${viewMode === 'month' ? 'bg-white/[0.06] text-white border border-white/[0.06]' : 'text-white/35 hover:bg-white/[0.04] hover:text-white'}`}
                >
                    <Calendar size={17} />
                    <span className="text-xs font-black uppercase tracking-wider">Calendar</span>
                </button>

                <button
                    onClick={() => navigate(id ? `/calendar/${id}?mode=week` : '/calendar?mode=week')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${viewMode === 'week' ? 'bg-white/[0.06] text-white border border-white/[0.06]' : 'text-white/35 hover:bg-white/[0.04] hover:text-white'}`}
                >
                    <CheckCircle2 size={17} />
                    <span className="text-xs font-black uppercase tracking-wider">Weekly Planner</span>
                </button>

                <div className="mt-auto pb-8 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/[0.04] group cursor-help relative">
                        <Bot size={15} className="text-white/15 group-hover:text-white transition-colors" />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <div className="flex-shrink-0 px-2 md:px-6 pt-2 md:pt-6 pb-2 md:pb-5">
                    {/* Mobile header */}
                    <div className="flex items-center gap-1.5 md:hidden mb-2">
                        {/* Back button */}
                        <button
                            onClick={() => id ? navigate(`/strategy/${id}`) : navigate('/dashboard')}
                            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all shrink-0"
                            aria-label="Go back"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        {/* View toggle */}
                        <div className="flex bg-white/[0.04] rounded-xl p-0.5 shrink-0 border border-white/[0.04]">
                            <button
                                onClick={() => navigate(id ? `/calendar/${id}` : '/calendar')}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${viewMode === 'month' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30'}`}
                            >
                                <Calendar size={11} /> Month
                            </button>
                            <button
                                onClick={() => navigate(id ? `/calendar/${id}?mode=week` : '/calendar?mode=week')}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${viewMode === 'week' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30'}`}
                            >
                                <CheckCircle2 size={11} /> Week
                            </button>
                        </div>

                        {/* Month/week navigator */}
                        <div className="flex items-center gap-0.5 ml-auto bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/[0.05] rounded-xl p-0.5">
                            <button onClick={previousMonth} className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white active:scale-90 transition-all">
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-[11px] font-bold text-white/70 px-1 whitespace-nowrap">
                                {viewMode === 'month'
                                    ? `${monthNames[month].slice(0, 3)} ${year}`
                                    : `${weekDays[0].getDate()} — ${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()].slice(0, 3)}`
                                }
                            </span>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white active:scale-90 transition-all">
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Today button */}
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="p-1.5 rounded-xl text-primary/60 hover:text-primary hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                            aria-label="Go to today"
                            title="Today"
                        >
                            <Sparkles size={15} />
                        </button>
                    </div>

                    {/* Desktop header */}
                    <div className="hidden md:flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                onClick={() => id ? navigate(`/strategy/${id}`) : navigate('/dashboard')}
                                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all shrink-0"
                                aria-label="Go back"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase truncate">
                                    {viewMode === 'month' ? 'Calendar' : 'Weekly Planner'}
                                </h1>
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60">
                                    {viewMode === 'month' ? 'Overview & Roadmap' : 'Execution & Focus'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 active:scale-95 transition-all"
                            >
                                <Sparkles size={13} /> Today
                            </button>
                            <div className="flex items-center gap-1 bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/[0.05]">
                                <button onClick={previousMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-xs font-black text-white px-2 text-center tracking-tight whitespace-nowrap">
                                    {viewMode === 'month'
                                        ? `${monthNames[month].slice(0, 3)} ${year}`
                                        : `${weekDays[0].getDate()} ${monthNames[weekDays[0].getMonth()].slice(0, 3)} — ${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()].slice(0, 3)}`
                                    }
                                </span>
                                <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reminder permission banner */}
                {notifPermission !== 'granted' && (
                    <div className="mx-2 md:mx-6 mb-2 md:mb-3 flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] flex-shrink-0 flex-wrap">
                        <div className="flex items-center gap-2">
                            <BellOff size={13} className="text-orange-400 shrink-0" />
                            <span className="text-[11px] md:text-xs text-white/60">
                                <span className="text-white/90 font-bold">Enable reminders</span>
                                <span className="hidden sm:inline"> — get notified 15 min before events</span>
                            </span>
                        </div>
                        <button
                            onClick={handleEnableReminders}
                            className="shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-orange-500/15 text-orange-400 text-[11px] md:text-xs font-black uppercase tracking-wider hover:bg-orange-500/25 active:scale-95 transition-all"
                        >
                            Enable
                        </button>
                    </div>
                )}

                {/* Body — Calendar + Side Panel */}
                <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-4 px-2 md:px-6 pb-20 md:pb-6 overflow-hidden min-h-0">

                    {/* Calendar Grid / Weekly Planner */}
                    <div className={`flex-1 rounded-2xl md:rounded-3xl border border-white/[0.04] flex flex-col overflow-hidden transition-all duration-300 ${viewMode === 'month' ? 'bg-[#080808]' : 'bg-[#090909]'}`}>
                        {viewMode === 'month' ? (
                            <>
                                {/* Day headers */}
                                <div className="grid grid-cols-7 border-b border-white/[0.04] flex-shrink-0 bg-white/[0.02]">
                                    {dayNames.map(d => (
                                        <div key={d} className="py-2 md:py-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white/20">
                                            <span className="md:hidden">{d[0]}</span>
                                            <span className="hidden md:inline">{d}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Day cells */}
                                <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
                                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                        <div key={`e-${i}`} className="border-b border-r border-white/[0.02]" />
                                    ))}

                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const key = formatKey(year, month, day);
                                        const dayEvents = activeCalendarEvents[key] || [];
                                        const isToday = key === todayKey;
                                        const isSelected = key === selectedDateKey;
                                        const hasEvents = dayEvents.length > 0;

                                        return (
                                            <div
                                                key={day}
                                                onClick={() => handleDayClick(key)}
                                                className={`
                                                    border-b border-r border-white/[0.02] p-0.5 md:p-3 cursor-pointer transition-all duration-200 relative group
                                                    ${isSelected ? 'bg-white/[0.06] z-10' : 'hover:bg-white/[0.03]'}
                                                `}
                                            >
                                                <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between mb-0.5 md:mb-2">
                                                    <span className={`
                                                        text-[11px] md:text-sm font-black w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-all duration-200
                                                        ${isToday ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,95,31,0.3)]' : isSelected ? 'bg-white/10 text-white' : 'text-white/30 group-hover:text-white/60'}
                                                    `}>
                                                        {day}
                                                    </span>
                                                    {hasEvents && (
                                                        <div className="flex gap-[3px] mt-0.5 md:mt-0">
                                                            {dayEvents.slice(0, 3).map(evt => (
                                                                <div key={evt.id} className={`w-[5px] h-[5px] rounded-full transition-all ${evt.completed ? 'bg-white/15' : 'bg-primary shadow-[0_0_4px_rgba(255,95,31,0.3)]'}`} />
                                                            ))}
                                                            {dayEvents.length > 3 && (
                                                                <span className="text-[7px] font-bold text-white/25 ml-0.5">+{dayEvents.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Event pills — desktop only */}
                                                <div className="hidden md:block space-y-1 overflow-hidden">
                                                    {dayEvents.slice(0, 2).map((evt) => (
                                                        <div
                                                            key={evt.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleCalendarEvent(key, evt.id, id);
                                                            }}
                                                            className={`text-[9px] font-bold truncate bg-white/[0.04] px-2 py-1 rounded-md flex items-center gap-1 leading-none transition-all border border-white/[0.03] hover:border-white/10 ${evt.completed ? 'opacity-20' : 'text-white/40'}`}
                                                        >
                                                            {evt.completed ? <CheckCircle2 size={8} className="text-white/40" /> : <Circle size={8} className="text-primary/40" />}
                                                            <span className="truncate">{evt.task}</span>
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <span className="text-[8px] font-bold text-white/15 px-2">+{dayEvents.length - 2} more</span>
                                                    )}
                                                </div>

                                                {isSelected && (
                                                    <div className="absolute inset-0 border-2 border-primary/30 rounded-sm pointer-events-none m-[-1px]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-white/[0.03] overflow-y-auto md:overflow-hidden custom-scrollbar">
                                {weekDays.map((date, i) => {
                                    const key = dateToKey(date);
                                    const dayEvents = activeCalendarEvents[key] || [];
                                    const isToday = key === todayKey;
                                    const isSelected = key === selectedDateKey;

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleDayClick(key)}
                                            className={`flex flex-col p-3 md:p-5 transition-all duration-200 min-h-[120px] md:min-h-0 md:h-full cursor-pointer relative group ${isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                                        >
                                            <div className="flex items-center justify-between mb-3 md:mb-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 group-hover:text-primary/40 transition-colors">{dayNames[i]}</span>
                                                    <span className={`text-2xl md:text-3xl font-black tracking-tighter ${isToday ? 'text-primary' : 'text-white/70'}`}>{date.getDate()}</span>
                                                </div>
                                                {isToday && (
                                                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,95,31,0.4)]" />
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar pr-1 pb-2 md:pb-4">
                                                {dayEvents.map(evt => (
                                                    <div
                                                        key={evt.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleCalendarEvent(key, evt.id, id);
                                                        }}
                                                        className={`p-3 md:p-4 rounded-xl flex flex-col gap-1.5 md:gap-2 transition-all duration-200 border ${evt.completed ? 'bg-white/[0.03] border-white/[0.03] opacity-20' : 'bg-white/[0.06] border-white/[0.04] hover:border-white/[0.12]'}`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock size={10} className="text-white/30" />
                                                                <span className={`text-[10px] font-bold text-white/50 uppercase tracking-wider ${evt.completed ? 'line-through' : ''}`}>{evt.time}</span>
                                                                {evt.time !== 'All Day' && notifPermission === 'granted' && !evt.completed && (
                                                                    <Bell size={9} className="text-orange-400/50" aria-label="Reminder set" />
                                                                )}
                                                            </div>
                                                            {evt.completed ? (
                                                                <CheckCircle2 size={13} className="text-white/30" />
                                                            ) : (
                                                                <Circle size={13} className="text-white/10 group-hover:text-white/30 transition-colors" />
                                                            )}
                                                        </div>
                                                        <span className={`text-[11px] md:text-xs font-bold leading-relaxed break-words tracking-tight ${evt.completed ? 'line-through text-white/20' : 'text-white/75'}`}>{evt.task}</span>
                                                    </div>
                                                ))}
                                                {dayEvents.length === 0 && (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-[0.04] border border-dashed border-white/10 rounded-2xl py-8 md:py-12 transition-all group-hover:opacity-[0.08]">
                                                        <Plus size={24} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest mt-3">Add Task</span>
                                                    </div>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary shadow-[0_0_6px_rgba(255,95,31,0.3)]" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Side Panel - Desktop only */}
                    <div className="hidden lg:flex lg:w-80 xl:w-96 bg-[#070707] rounded-2xl md:rounded-3xl border border-white/[0.04] flex-col overflow-hidden flex-shrink-0 relative">
                        <div className="flex-shrink-0 px-6 pt-7 pb-5 border-b border-white/[0.04] bg-white/[0.01]">
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`p-2 rounded-xl transition-all ${selectedDateKey ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/[0.04] text-white/20 border border-white/[0.04]'}`}>
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                        {selectedDateLabel || 'Mission Briefing'}
                                    </h3>
                                    <p className="text-[10px] text-white/25 font-bold tracking-widest uppercase">
                                        {selectedDateKey ? 'Daily Execution List' : 'Select a date to begin'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Events List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0">
                            {selectedDateKey ? (
                                selectedEvents.length > 0 ? (
                                    selectedEvents.map((evt) => (
                                        <div
                                            key={evt.id}
                                            className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${evt.completed ? 'bg-white/5 border-white/5 opacity-20' : 'bg-white/10 border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    className="flex items-center gap-3 cursor-pointer"
                                                    onClick={() => toggleCalendarEvent(selectedDateKey, evt.id, id)}
                                                >
                                                    {evt.completed ? (
                                                        <CheckCircle2 size={18} className="text-white/40" />
                                                    ) : (
                                                        <Circle size={18} className="text-white/20 group-hover:text-white transition-all" />
                                                    )}
                                                    <div className="px-3 py-1 bg-white/5 text-white/60 text-[10px] font-black rounded-lg flex items-center gap-2 border border-white/10">
                                                        <Clock size={12} />
                                                        {evt.time}
                                                    </div>
                                                    {/* Bell icon shows on timed events when reminders are on */}
                                                    {evt.time !== 'All Day' && notifPermission === 'granted' && !evt.completed && (
                                                        <Bell size={12} className="text-orange-400/60" aria-label="Reminder set" />
                                                    )}
                                                </div>
                                <button
                                    onClick={() => removeCalendarEvent(selectedDateKey, evt.id, id)}
                                    className="text-white/20 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all p-2.5 hover:bg-red-500/10 rounded-xl"
                                >
                                    <Trash2 size={16} />
                                </button>
                                            </div>
                                            <span
                                                className={`text-sm leading-relaxed font-bold tracking-tight px-1 flex items-start gap-3 cursor-pointer ${evt.completed ? 'line-through text-white/20' : 'text-white/90'}`}
                                                onClick={() => toggleCalendarEvent(selectedDateKey, evt.id, id)}
                                            >
                                                <FileText size={18} className="mt-0.5 text-white/20 flex-shrink-0" />
                                                {evt.task}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-white/10 gap-4 py-12 opacity-20">
                                        <Bot size={48} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">No active objectives</span>
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-white/5 gap-4 py-12">
                                    <Layout size={64} className="opacity-10" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ready for input</span>
                                </div>
                            )}
                        </div>

                        {/* Add Event Input — desktop only */}
                        <div className="flex-shrink-0 p-8 pt-0 mt-auto">
                            <div className={`p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-4 transition-all duration-300 ${selectedDateKey ? 'opacity-100' : 'opacity-10 pointer-events-none'}`}>
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" />
                                        <input
                                            ref={timeInputRef}
                                            type="time"
                                            value={newEventTime}
                                            onChange={(e) => setNewEventTime(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all font-bold cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newEventTitle}
                                            onChange={(e) => setNewEventTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                                            placeholder="Assign objective..."
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all placeholder-white/5 font-bold"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddEvent}
                                    disabled={!selectedDateKey || !newEventTitle.trim()}
                                    className="w-full py-4 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white/90 transition-all disabled:opacity-10 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Plus size={20} />
                                    Add Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile bottom nav */}
            {id && <MobileNav canvasId={id} />}

            {/* Mobile Event Modal */}
            {selectedDateKey && (
                <div className="lg:hidden fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                        onClick={() => setSelectedDateKey(null)}
                    />
                    <div className="relative w-full sm:max-w-sm bg-[#0a0a0a] border border-white/[0.06] rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]">
                        {/* Drag handle for mobile sheet feel */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 rounded-full bg-white/10" />
                        </div>

                        {/* Modal Header */}
                        <div className="px-5 pt-3 pb-4 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                                    <Calendar size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">{selectedDateLabel}</h3>
                                    <p className="text-[9px] uppercase font-bold tracking-widest text-white/25">
                                        {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDateKey(null)}
                                className="p-2 hover:bg-white/5 rounded-xl text-white/30 active:scale-90 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Events List */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
                            {selectedEvents.length > 0 ? (
                                selectedEvents.map((evt) => (
                                    <div
                                        key={evt.id}
                                        className={`group flex flex-col gap-2 p-4 bg-white/[0.03] border border-white/[0.04] rounded-2xl transition-all duration-200 ${evt.completed ? 'opacity-25' : 'active:scale-[0.98]'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer flex-1"
                                                onClick={() => toggleCalendarEvent(selectedDateKey, evt.id, id)}
                                            >
                                                {evt.completed ? (
                                                    <CheckCircle2 size={20} className="text-primary/50 shrink-0" />
                                                ) : (
                                                    <Circle size={20} className="text-white/15 shrink-0" />
                                                )}
                                                <span
                                                    className={`text-sm font-bold leading-snug flex-1 ${evt.completed ? 'line-through text-white/30' : 'text-white/85'}`}
                                                >
                                                    {evt.task}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeCalendarEvent(selectedDateKey, evt.id, id)}
                                                className="p-2 hover:bg-red-500/10 text-white/10 hover:text-red-500 rounded-xl transition-all shrink-0 ml-2"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 pl-7">
                                            <div className="px-2 py-0.5 bg-white/[0.04] text-white/40 text-[10px] font-bold rounded-lg flex items-center gap-1.5 border border-white/[0.04]">
                                                <Clock size={9} />
                                                {evt.time}
                                            </div>
                                            {evt.time !== 'All Day' && notifPermission === 'granted' && !evt.completed && (
                                                <Bell size={10} className="text-orange-400/50" aria-label="Reminder set" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 flex flex-col items-center justify-center text-white/10 gap-3">
                                    <Calendar size={32} className="text-white/[0.06]" />
                                    <span className="text-xs font-bold tracking-tight text-white/15">No events yet</span>
                                </div>
                            )}
                        </div>

                        {/* Add Event Input */}
                        <div className="p-4 bg-[#060606] border-t border-white/[0.04]">
                            <div className="flex flex-col gap-2.5">
                                <div className="flex gap-2">
                                    <div className="relative group w-[110px] shrink-0">
                                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15 group-focus-within:text-white/40 transition-colors" />
                                        <input
                                            ref={timeInputRef}
                                            type="time"
                                            value={newEventTime}
                                            onChange={(e) => setNewEventTime(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/[0.05] rounded-xl pl-9 pr-2 py-3 text-sm text-white focus:outline-none focus:border-white/15 transition-all font-bold cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-40"
                                        />
                                    </div>
                                    <div className="relative group flex-1">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newEventTitle}
                                            onChange={(e) => setNewEventTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                                            placeholder="What needs to be done?"
                                            className="w-full bg-white/[0.04] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/30 transition-all placeholder-white/15"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddEvent}
                                    disabled={!newEventTitle.trim()}
                                    className="w-full py-3.5 bg-primary text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all disabled:opacity-10 active:scale-[0.97] flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add Event
                                </button>
                            </div>
                        </div>

                        {/* Safe area for bottom nav */}
                        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} className="bg-[#060606]" />
                    </div>
                </div>
            )}
        </div>
    );
}
