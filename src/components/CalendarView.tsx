import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';

export default function CalendarView() {
    const { id } = useParams<{ id: string }>();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<{ date: string; title: string; id: string }[]>([]);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleAddEvent = () => {
        if (newEventTitle && selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            setEvents([...events, { date: dateStr, title: newEventTitle, id: Date.now().toString() }]);
            setNewEventTitle('');
            setShowAddEvent(false);
        }
    };

    const getEventsForDate = (day: number) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        return events.filter(e => e.date === dateStr);
    };

    return (
        <div className="w-screen h-screen bg-[#0b0b0b] text-white flex">
            {id && <Sidebar canvasId={id} />}

            <div className="flex-1 p-10 w-full overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-4xl font-bold text-white tracking-tight">Calendar</h1>
                        <button
                            onClick={() => { setShowAddEvent(true); setSelectedDate(new Date()); }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg text-primary transition-all"
                        >
                            <Plus size={18} />
                            <span>Add Event</span>
                        </button>
                    </div>

                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={previousMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <ChevronLeft size={24} className="text-white" />
                        </button>
                        <h2 className="text-2xl font-semibold text-white">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <ChevronRight size={24} className="text-white" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="bg-[#151515] rounded-2xl p-6 border border-white/10">
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-secondary text-sm font-medium py-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dayEvents = getEventsForDate(day);
                                return (
                                    <div
                                        key={day}
                                        className="aspect-square bg-[#1a1a1a] hover:bg-[#252525] rounded-lg p-2 cursor-pointer transition-colors border border-white/5 hover:border-primary/30"
                                        onClick={() => { setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setShowAddEvent(true); }}
                                    >
                                        <div className="text-white text-sm font-medium mb-1">{day}</div>
                                        {dayEvents.map(event => (
                                            <div key={event.id} className="text-xs text-primary bg-primary/10 rounded px-1 py-0.5 mb-1 truncate">
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Add Event Modal */}
                    {showAddEvent && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddEvent(false)}>
                            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/10 w-96" onClick={e => e.stopPropagation()}>
                                <h3 className="text-white font-semibold mb-4">Add Event</h3>
                                <input
                                    type="text"
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    placeholder="Event title..."
                                    className="w-full bg-[#151515] text-white px-4 py-2 rounded-lg outline-none border border-white/10 focus:border-primary/50 mb-4"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddEvent}
                                        className="flex-1 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg text-primary transition-all"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => setShowAddEvent(false)}
                                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
