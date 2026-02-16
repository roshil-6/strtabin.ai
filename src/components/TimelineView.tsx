import { useParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { CalendarClock, Plus, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

export default function TimelineView() {
    const { id } = useParams<{ id: string }>();
    const { timelines, updateTimeline } = useStore(
        useShallow(state => ({
            timelines: state.timelines,
            updateTimeline: state.updateTimeline
        }))
    );

    const timeline = id ? timelines[id] : null;
    const [newItemTitle, setNewItemTitle] = useState('');
    const [activeLaneDetails, setActiveLaneDetails] = useState<string | null>(null);

    if (!timeline) {
        return <div className="p-10 text-white">Timeline not found</div>;
    }

    const handleAddItem = (laneId: string) => {
        if (!newItemTitle.trim()) return;

        const newItem = {
            id: crypto.randomUUID(),
            laneId,
            title: newItemTitle,
            startDate: Date.now(),
            duration: 7, // Default 1 week
            completed: false
        };

        updateTimeline(timeline.id, {
            items: [...timeline.items, newItem]
        });
        setNewItemTitle('');
        setActiveLaneDetails(null);
    };

    const handleAddLane = () => {
        const newLane = {
            id: crypto.randomUUID(),
            title: 'New Phase',
            color: '#3b82f6'
        };
        updateTimeline(timeline.id, {
            lanes: [...timeline.lanes, newLane]
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0b0b0b] text-white overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-[#111]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                        <CalendarClock size={20} />
                    </div>
                    <input
                        type="text"
                        value={timeline.title}
                        onChange={(e) => updateTimeline(timeline.id, { title: e.target.value })}
                        className="bg-transparent text-lg font-semibold outline-none focus:text-purple-400 transition-colors"
                    />
                </div>
            </div>

            {/* Gantt / Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
                <div className="min-w-[800px] space-y-6">
                    {timeline.lanes.map(lane => (
                        <div key={lane.id} className="relative group">
                            {/* Lane Header */}
                            <div className="flex items-center gap-2 mb-3 px-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lane.color }}></div>
                                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">{lane.title}</h3>
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-secondary hover:text-white transition-all">
                                    <MoreHorizontal size={14} />
                                </button>
                            </div>

                            {/* Lane Track */}
                            <div className="w-full h-32 bg-[#151515] rounded-xl border border-white/5 relative hover:border-white/10 transition-colors flex items-center px-4 gap-4 overflow-x-auto">

                                {/* Items */}
                                {timeline.items.filter(i => i.laneId === lane.id).map(item => (
                                    <div
                                        key={item.id}
                                        className="min-w-[150px] h-20 bg-[#252525] rounded-lg border border-white/10 p-3 hover:border-purple-500/50 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex flex-col justify-between"
                                        style={{ borderLeft: `4px solid ${lane.color}` }}
                                    >
                                        <span className="text-sm font-medium truncate leading-tight block">{item.title}</span>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-white/30">{item.duration} days</span>
                                            <div className={`w-3 h-3 rounded-full border border-white/20 ${item.completed ? 'bg-green-500 border-green-500' : 'bg-transparent'}`}></div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Item Button */}
                                <div className="relative">
                                    {activeLaneDetails === lane.id ? (
                                        <div className="w-[150px] h-20 bg-[#1a1a1a] rounded-lg border border-dashed border-white/20 flex flex-col p-2">
                                            <input
                                                autoFocus
                                                value={newItemTitle}
                                                onChange={e => setNewItemTitle(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddItem(lane.id)}
                                                onBlur={() => activeLaneDetails === lane.id && !newItemTitle && setActiveLaneDetails(null)}
                                                className="bg-transparent text-sm outline-none text-white w-full h-full resize-none"
                                                placeholder="Task name..."
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setActiveLaneDetails(lane.id)}
                                            className="w-10 h-20 rounded-lg border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 flex items-center justify-center transition-all text-white/30 hover:text-white"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Lane Button */}
                    <button
                        onClick={handleAddLane}
                        className="w-full py-4 border border-dashed border-white/10 rounded-xl text-white/30 hover:text-white hover:bg-white/5 hover:border-white/30 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        <span>Add Project Phase</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
