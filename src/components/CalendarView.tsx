import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Trash2, Bot, Clock, FileText } from 'lucide-react';
import Sidebar from './Sidebar';
import useStore from '../store/useStore';

export default function CalendarView() {
    const { id } = useParams<{ id: string }>();
    const { calendarEvents, addCalendarEvent, removeCalendarEvent } = useStore();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const formatKey = (y: number, m: number, d: number) =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const todayKey = formatKey(
        new Date().getFullYear(), new Date().getMonth(), new Date().getDate()
    );

    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1));
        setSelectedDateKey(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1));
        setSelectedDateKey(null);
    };

    const handleDayClick = (day: number) => {
        const key = formatKey(year, month, day);
        setSelectedDateKey(prev => (prev === key ? null : key));
        setNewEventTitle('');
        setNewEventTime('');
        // Auto-focus time input after small delay
        setTimeout(() => timeInputRef.current?.focus(), 100);
    };

    const handleAddEvent = () => {
        if (!newEventTitle.trim() || !selectedDateKey || !newEventTime.trim()) return;
        addCalendarEvent(selectedDateKey, newEventTime.trim(), newEventTitle.trim());
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

    const selectedEvents = selectedDateKey ? (calendarEvents[selectedDateKey] || []) : [];

    // Focus input when a date is selected
    useEffect(() => {
        if (selectedDateKey) inputRef.current?.focus();
    }, [selectedDateKey]);

    return (
        <div className="w-screen h-screen bg-[#0b0b0b] text-white flex overflow-hidden">
            {id && <Sidebar canvasId={id} />}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-black tracking-tight text-white flex flex-col">
                            Calendar
                            <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60 mt-0.5">
                                (tap any date to add task and time)
                            </span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <button onClick={previousMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                <ChevronLeft size={20} className="text-white/60" />
                            </button>
                            <span className="text-base font-bold text-white min-w-[160px] text-center">
                                {monthNames[month]} {year}
                            </span>
                            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                <ChevronRight size={20} className="text-white/60" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body — Calendar + Side Panel */}
                <div className="flex-1 flex flex-col lg:flex-row gap-4 px-6 pb-6 overflow-hidden min-h-0">

                    {/* Calendar Grid */}
                    <div className="flex-1 bg-[#141414] rounded-xl border border-[#2a2a2a] flex flex-col overflow-hidden">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-[#2a2a2a] flex-shrink-0">
                            {dayNames.map(d => (
                                <div key={d} className="py-3 text-center text-[11px] font-bold uppercase tracking-widest text-white/30">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
                            {/* Empty leading slots */}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <div key={`e-${i}`} className="border-b border-r border-[#1e1e1e]" />
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const key = formatKey(year, month, day);
                                const dayEvents = calendarEvents[key] || [];
                                const isToday = key === todayKey;
                                const isSelected = key === selectedDateKey;

                                return (
                                    <div
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                            border-b border-r border-[#1e1e1e] p-2 cursor-pointer transition-colors relative
                                            ${isSelected ? 'bg-white/10 ring-1 ring-inset ring-white/20' : 'hover:bg-[#1a1a1a]'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`
                                                text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-primary text-black' : isSelected ? 'text-primary' : 'text-white/60'}
                                            `}>
                                                {day}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <span className="text-[9px] text-primary font-bold bg-white/10 rounded-full px-1">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-0.5 overflow-hidden">
                                            {dayEvents.slice(0, 2).map((evt) => (
                                                <div key={evt.id} className="text-[10px] text-white/60 truncate bg-[#222] px-1 rounded flex items-center gap-1 leading-4">
                                                    <span className="text-primary font-bold opacity-70">{evt.time}</span>
                                                    <span className="truncate">{evt.task}</span>
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <div className="text-[9px] text-white/30">+{dayEvents.length - 2} more</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Side Panel - Desktop only */}
                    <div className="hidden lg:flex lg:w-72 xl:w-80 bg-[#141414] rounded-xl border border-[#2a2a2a] flex-col overflow-hidden flex-shrink-0">
                        {/* Panel Header */}
                        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[#2a2a2a]">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar size={16} className={selectedDateKey ? 'text-primary' : 'text-white/30'} />
                                <h3 className="text-sm font-bold text-white">
                                    {selectedDateLabel || 'Select a Date'}
                                </h3>
                            </div>
                            {!selectedDateKey && (
                                <p className="text-xs text-white/30">Tap any day to view or add events</p>
                            )}
                        </div>

                        {/* Events List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-0">
                            {selectedDateKey ? (
                                selectedEvents.length > 0 ? (
                                    selectedEvents.map((evt) => (
                                        <div key={evt.id} className="group flex flex-col gap-1 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:border-primary/30 transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-0.5 bg-white/10 text-primary text-[10px] font-black rounded-lg flex items-center gap-1 border border-white/10">
                                                        <Clock size={10} />
                                                        {evt.time}
                                                    </div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(218,119,86,0.5)]" />
                                                </div>
                                                <button
                                                    onClick={() => removeCalendarEvent(selectedDateKey, evt.id)}
                                                    className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                            <span className="text-sm text-white/90 leading-tight break-words font-medium px-1 flex items-start gap-2">
                                                <FileText size={14} className="mt-0.5 text-white/30" />
                                                {evt.task}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2 py-10">
                                        <Calendar size={28} />
                                        <span className="text-sm italic">No events yet</span>
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-white/10 gap-2 py-10">
                                    <Calendar size={32} />
                                    <span className="text-sm">No date selected</span>
                                </div>
                            )}
                        </div>

                        {/* Add Event Input — desktop only */}
                        <div className="hidden lg:block flex-shrink-0 p-5 border-t border-white/5 bg-black/40 backdrop-blur-xl">
                            <div className="flex flex-col gap-4">
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" />
                                        <input
                                            ref={timeInputRef}
                                            type="time"
                                            value={newEventTime}
                                            onChange={(e) => setNewEventTime(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newEventTitle}
                                            onChange={(e) => setNewEventTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                                            placeholder="Task details..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder-white/20"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddEvent}
                                    disabled={!selectedDateKey || !newEventTitle.trim() || !newEventTime.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-primary to-[#ff9d7d] text-black text-sm font-black rounded-xl hover:opacity-90 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(218,119,86,0.3)] active:scale-[0.98]"
                                >
                                    <Plus size={18} />
                                    Add to Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Event Add Modal */}
            {selectedDateKey && (
                <div className="lg:hidden fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setSelectedDateKey(null)}
                    />
                    <div className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 flex flex-col max-h-[80vh]">
                        {/* Modal Header */}
                        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between bg-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-2xl">
                                    <Calendar size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">{selectedDateLabel}</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 truncate">Manage daily events</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDateKey(null)}
                                className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Events List in Modal */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#141414]">
                            {selectedEvents.length > 0 ? (
                                selectedEvents.map((evt) => (
                                    <div key={evt.id} className="group flex flex-col gap-2 p-5 bg-white/5 border border-white/5 rounded-3xl hover:border-primary/30 transition-all shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-white/10 text-primary text-[11px] font-black rounded-xl flex items-center gap-2 border border-white/10">
                                                    <Clock size={12} />
                                                    {evt.time}
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(218,119,86,0.6)]" />
                                            </div>
                                            <button
                                                onClick={() => removeCalendarEvent(selectedDateKey, evt.id)}
                                                className="p-2.5 hover:bg-red-500/10 text-white/10 hover:text-red-500 rounded-2xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <span className="text-lg text-white/90 font-bold leading-tight flex items-start gap-3">
                                            <FileText size={20} className="mt-0.5 text-white/20" />
                                            {evt.task}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-white/10 gap-3 opacity-40">
                                    <Bot size={40} className="grayscale" />
                                    <span className="text-sm font-bold tracking-tight italic">Your agenda is clear</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Input */}
                        <div className="p-8 bg-black/60 border-t border-white/10 backdrop-blur-2xl">
                            <div className="flex flex-col gap-5">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" />
                                        <input
                                            ref={timeInputRef}
                                            type="time"
                                            value={newEventTime}
                                            onChange={(e) => setNewEventTime(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newEventTitle}
                                            onChange={(e) => setNewEventTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                                            placeholder="Task details..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder-white/20 shadow-inner"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddEvent}
                                    disabled={!newEventTitle.trim() || !newEventTime.trim()}
                                    className="w-full py-5 bg-gradient-to-r from-primary to-[#ff9d7d] text-black font-black text-xl rounded-[24px] hover:opacity-90 transition-all disabled:opacity-20 shadow-[0_20px_40px_rgba(218,119,86,0.3)] active:scale-[0.97] flex items-center justify-center gap-3"
                                >
                                    <Plus size={24} />
                                    Save Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
