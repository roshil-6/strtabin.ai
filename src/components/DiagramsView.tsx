import { useState } from 'react';
import useStore from '../store/useStore';
import { GitBranch, Workflow, Search, Filter, Trash2, Eye } from 'lucide-react';

export default function DiagramsView() {
    const diagrams = useStore(state => state.diagrams);
    const deleteDiagram = useStore(state => state.deleteDiagram);
    const [filter, setFilter] = useState<'all' | 'branch' | 'flowchart'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDiagram, setSelectedDiagram] = useState<string | null>(null);

    const filteredDiagrams = diagrams.filter(diagram => {
        const matchesFilter = filter === 'all' || diagram.type === filter;
        const matchesSearch =
            diagram.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            diagram.canvasName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="p-10 w-full h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Diagrams</h1>
                        <p className="text-secondary">All your visual thinking in one place</p>
                    </div>
                    <div className="flex items-center gap-2 text-secondary text-sm">
                        <span>{filteredDiagrams.length} diagram{filteredDiagrams.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search diagrams..."
                            className="w-full bg-[#151515] text-white pl-10 pr-4 py-3 rounded-lg outline-none border border-white/10 focus:border-primary/50"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-[#151515] rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md text-sm transition-all ${filter === 'all' ? 'bg-primary/20 text-primary' : 'text-secondary hover:text-white'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('branch')}
                            className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${filter === 'branch' ? 'bg-primary/20 text-primary' : 'text-secondary hover:text-white'
                                }`}
                        >
                            <GitBranch size={16} />
                            Branches
                        </button>
                        <button
                            onClick={() => setFilter('flowchart')}
                            className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${filter === 'flowchart' ? 'bg-primary/20 text-primary' : 'text-secondary hover:text-white'
                                }`}
                        >
                            <Workflow size={16} />
                            Flowcharts
                        </button>
                    </div>
                </div>

                {/* Diagrams Grid */}
                {filteredDiagrams.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            {filter === 'branch' ? <GitBranch size={24} className="text-secondary" /> : <Workflow size={24} className="text-secondary" />}
                        </div>
                        <p className="text-secondary">
                            {searchQuery ? 'No diagrams match your search' : 'No diagrams yet. Create one from a canvas!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDiagrams.map(diagram => (
                            <div
                                key={diagram.id}
                                className="bg-[#151515] rounded-xl p-5 border border-white/10 hover:border-primary/30 transition-all group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${diagram.type === 'branch' ? 'bg-green-500/10' : 'bg-blue-500/10'
                                            }`}>
                                            {diagram.type === 'branch' ? (
                                                <GitBranch size={18} className="text-green-500" />
                                            ) : (
                                                <Workflow size={18} className="text-blue-500" />
                                            )}
                                        </div>
                                        <span className="text-xs text-secondary uppercase tracking-wide">
                                            {diagram.type}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => deleteDiagram(diagram.id)}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-secondary hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Content */}
                                <h3 className="text-white font-medium mb-2 line-clamp-2">
                                    "{diagram.sourceText}"
                                </h3>
                                <div className="text-secondary text-sm space-y-1 mb-4">
                                    <p>Canvas: {diagram.canvasName}</p>
                                    <p>
                                        {diagram.type === 'branch'
                                            ? `${(diagram.data as any).branches?.length || 0} branches`
                                            : `${(diagram.data as any).nodes?.length || 0} nodes`
                                        }
                                    </p>
                                    <p className="text-xs">{formatDate(diagram.createdAt)}</p>
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={() => setSelectedDiagram(diagram.id)}
                                    className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-sm font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Eye size={16} />
                                    View Diagram
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
