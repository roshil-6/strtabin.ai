import { useMemo } from 'react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Calendar, Clock } from 'lucide-react';

export default function TimelineMode() {
    const { nodes } = useStore(useShallow(state => ({ nodes: state.nodes })));

    // Convert nodes to timeline items if they have date data, otherwise mock it for demo
    const items = useMemo(() => {
        return nodes.map((node, index) => ({
            id: node.id,
            title: node.data.label as string,
            start: Date.now() + (index * 86400000), // Stagger days
            duration: 2 + (index % 3), // Random duration
            type: node.type
        })).sort((a, b) => a.start - b.start);
    }, [nodes]);

    return (
        <div className="w-full h-full bg-[#0b0b0b] p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Calendar className="text-primary" />
                Project Timeline
            </h2>

            <div className="space-y-4">
                {items.map(item => (
                    <div key={item.id} className="relative h-16 bg-[#151515] rounded-xl border border-white/5 flex items-center px-4 hover:border-primary/30 transition-all group">

                        {/* Time Connector Line */}
                        <div className="absolute left-6 top-16 w-0.5 h-4 bg-white/10 z-0 last:hidden" />

                        {/* Status Indicator */}
                        <div className={`w-3 h-3 rounded-full mr-4 z-10 
                            ${item.type === 'decision' ? 'bg-yellow-400' : item.type === 'question' ? 'bg-blue-400' : 'bg-primary'}`}
                        />

                        {/* Content */}
                        <div className="flex-1">
                            <h3 className="text-white font-medium">{item.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-secondary mt-1">
                                <Clock size={12} />
                                <span>{new Date(item.start).toLocaleDateString()}</span>
                                <span>• {item.duration} days</span>
                            </div>
                        </div>

                        {/* Visual Bar */}
                        <div className="w-1/3 h-full flex items-center px-4">
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full opacity-50 ${item.type === 'decision' ? 'bg-yellow-400' : 'bg-primary'}`}
                                    style={{ width: `${Math.random() * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center text-secondary py-20">
                        No items to display. Add nodes in the canvas first.
                    </div>
                )}
            </div>
        </div>
    );
}
