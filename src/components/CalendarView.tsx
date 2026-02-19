import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from 'lucide-react';
import Sidebar from './Sidebar';
import useStore from '../store/useStore';

export default function CalendarView() {
    const { id } = useParams<{ id: string }>();
    const { calendarEvents, addCalendarEvent, removeCalendarEvent } = useStore();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

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
        // Auto-focus input after small delay
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleAddEvent = () => {
        if (!newEventTitle.trim() || !selectedDateKey) return;
        addCalendarEvent(selectedDateKey, newEventTitle.trim());
        setNewEventTitle('');
        inputRef.current?.focus();
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
                        <h1 className="text-3xl font-black tracking-tight text-white">
                            Calendar<span className="text-primary">.</span>
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
                                            ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'hover:bg-[#1a1a1a]'}
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
                                                <span className="text-[9px] text-primary font-bold bg-primary/10 rounded-full px-1">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-0.5 overflow-hidden">
                                            {dayEvents.slice(0, 2).map((evt, idx) => (
                                                <div key={idx} className="text-[10px] text-white/60 truncate bg-[#222] px-1 rounded leading-4">
                                                    {evt}
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

                    {/* Side Panel */}
                    <div className="lg:w-72 xl:w-80 bg-[#141414] rounded-xl border border-[#2a2a2a] flex flex-col overflow-hidden flex-shrink-0">
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
                                    selectedEvents.map((evt, idx) => (
                                        <div key={idx} className="group flex items-start gap-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-primary/30 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                            <span className="flex-1 text-sm text-white/80 leading-snug break-words">{evt}</span>
                                            <button
                                                onClick={() => removeCalendarEvent(selectedDateKey, idx)}
                                                className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                                            >
                                                <X size={13} />
                                            </button>
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

                        {/* Add Event Input — always shown, disabled until date selected */}
                        <div className="flex-shrink-0 p-4 border-t border-[#2a2a2a]">
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                                    placeholder={selectedDateKey ? 'Add event...' : 'Select a day first'}
                                    disabled={!selectedDateKey}
                                    className="flex-1 bg-[#0b0b0b] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed placeholder-white/20"
                                />
                                <button
                                    onClick={handleAddEvent}
                                    disabled={!selectedDateKey || !newEventTitle.trim()}
                                    className="p-2 bg-primary text-black rounded-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
