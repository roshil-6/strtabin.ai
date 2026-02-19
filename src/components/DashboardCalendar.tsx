import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import useStore from '../store/useStore';

export default function DashboardCalendar() {
    const { calendarEvents, addCalendarEvent, removeCalendarEvent } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [newEventText, setNewEventText] = useState('');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    const formatDateKey = (day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const handleDayClick = (day: number) => {
        const dateKey = formatDateKey(day);
        setSelectedDate(dateKey === selectedDate ? null : dateKey);
    };

    const handleAddEvent = () => {
        if (!selectedDate || !newEventText.trim()) return;
        addCalendarEvent(selectedDate, newEventText.trim());
        setNewEventText('');
    };

    const handleDeleteEvent = (dateKey: string, index: number) => {
        removeCalendarEvent(dateKey, index);
    };

    const renderCalendarGrid = () => {
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-[#0b0b0b] border border-[#1a1a1a]/50 opacity-50"></div>);
        }

        // Days of current month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = formatDateKey(d);
            const events = calendarEvents[dateKey] || [];
            const isSelected = selectedDate === dateKey;
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

            days.push(
                <div
                    key={d}
                    onClick={() => handleDayClick(d)}
                    className={`
                        h-24 p-2 border border-[#1a1a1a] relative cursor-pointer transition-all hover:bg-[#1a1a1a]
                        ${isSelected ? 'bg-[#1a1a1a] ring-1 ring-primary z-10' : 'bg-[#141414]'}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <span className={`
                            text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                            ${isToday ? 'bg-primary text-black' : 'text-white/60'}
                        `}>
                            {d}
                        </span>
                        {events.length > 0 && (
                            <div className="flex gap-1">
                                {events.slice(0, 3).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                                ))}
                                {events.length > 3 && <span className="text-[10px] text-white/40">+</span>}
                            </div>
                        )}
                    </div>

                    {/* Mini Event Preview */}
                    <div className="mt-2 space-y-1 overflow-hidden">
                        {events.slice(0, 2).map((evt, i) => (
                            <div key={i} className="text-[10px] text-white/70 truncate bg-[#222] px-1 rounded block">
                                {evt}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
            {/* Main Calendar View */}
            <div className="flex-1 bg-[#141414] rounded-lg border border-[#2a2a2a] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {monthNames[month]} <span className="text-white/40">{year}</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-[#222] rounded text-white/60 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-[#222] rounded text-white/60 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px mb-px bg-[#2a2a2a] border border-[#2a2a2a] rounded overflow-hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="bg-[#141414] p-3 text-center text-xs font-bold uppercase tracking-widest text-white/40">
                            {day}
                        </div>
                    ))}
                    {renderCalendarGrid()}
                </div>
            </div>

            {/* Side Panel: Selected Date Events */}
            <div className={`
                lg:w-80 bg-[#141414] rounded-lg border border-[#2a2a2a] p-6 flex flex-col shadow-sm transition-all
                ${selectedDate ? 'opacity-100 translate-x-0' : 'opacity-50 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}
            `}>
                <div className="mb-6 pb-4 border-b border-[#2a2a2a]">
                    <h3 className="text-lg font-bold text-white">Events</h3>
                    <p className="text-sm text-white/40">
                        {selectedDate
                            ? (() => {
                                const [y, m, d] = selectedDate.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
                            })()
                            : 'Select a date to manage events'
                        }
                    </p>
                </div>

                {selectedDate ? (
                    <>
                        <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px] mb-4 custom-scrollbar">
                            {(calendarEvents[selectedDate] || []).map((evt, idx) => (
                                <div key={idx} className="group flex items-start justify-between gap-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded hover:border-primary/30 transition-colors">
                                    <span className="text-sm text-white/90 leading-snug break-words">{evt}</span>
                                    <button
                                        onClick={() => handleDeleteEvent(selectedDate, idx)}
                                        className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {(calendarEvents[selectedDate] || []).length === 0 && (
                                <div className="text-center py-8 text-white/20 italic text-sm">No events marked.</div>
                            )}
                        </div>

                        <div className="mt-auto">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newEventText}
                                    onChange={(e) => setNewEventText(e.target.value)}
                                    placeholder="Add event..."
                                    className="flex-1 bg-[#0b0b0b] border border-[#2a2a2a] rounded p-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                                />
                                <button
                                    onClick={handleAddEvent}
                                    className="p-2 bg-primary text-black rounded hover:bg-white transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                        <CalendarIcon size={32} opacity={0.5} />
                        <span className="text-sm">Select a date</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function CalendarIcon({ size, opacity }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity }}
        >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    );
}
