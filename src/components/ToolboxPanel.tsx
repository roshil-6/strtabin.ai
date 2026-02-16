import { GitBranch, Workflow, FileText, ArrowLeft, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface Branch {
    id: string;
    sourceText: string;
    branches: string[];
    type: 'branch' | 'flowchart';
}

interface ToolboxPanelProps {
    // No props needed
}

export default function ToolboxPanel({ }: ToolboxPanelProps) {
    const [view, setView] = useState<'tools' | 'create-branch' | 'create-flowchart' | 'view-branch'>('tools');
    const [branchCount, setBranchCount] = useState(2);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [branchLabels, setBranchLabels] = useState<string[]>(['', '']);
    const [manualRootText, setManualRootText] = useState('');

    const handleCreateBranch = () => {
        setView('create-branch');
        setBranchLabels(Array(branchCount).fill(''));
        setManualRootText('');
    };

    const handleCreateFlowchart = () => {
        setView('create-flowchart');
        setBranchLabels(Array(branchCount).fill(''));
        setManualRootText('');
    };

    const saveBranch = (type: 'branch' | 'flowchart') => {
        const rootText = manualRootText || "New Idea";
        const newBranch: Branch = {
            id: Date.now().toString(),
            sourceText: rootText,
            branches: branchLabels.filter(b => b.trim()),
            type,
        };
        setBranches([...branches, newBranch]);
        setCurrentBranch(newBranch);
        setView('view-branch');
    };

    const updateBranchCount = (delta: number) => {
        const newCount = Math.max(2, Math.min(7, branchCount + delta));
        setBranchCount(newCount);
        setBranchLabels(prev => {
            if (newCount > prev.length) {
                return [...prev, ...Array(newCount - prev.length).fill('')];
            }
            return prev.slice(0, newCount);
        });
    };

    // Tools View
    if (view === 'tools') {
        return (
            <div className="h-full w-full bg-[#0f0f0f] border-l border-white/10 p-6 overflow-y-auto">
                <h3 className="text-white font-semibold mb-6 text-sm uppercase tracking-wide">Tools</h3>

                <div className="space-y-3">
                    <button
                        onClick={handleCreateBranch}
                        className="w-full group bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 hover:border-primary/50 rounded-xl p-4 transition-all text-left"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <GitBranch size={20} className="text-primary" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium mb-1">Create Branch</h4>
                                <p className="text-secondary text-sm">Generate a visual branch diagram from your writing</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={handleCreateFlowchart}
                        className="w-full group bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 hover:border-primary/50 rounded-xl p-4 transition-all text-left"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Workflow size={20} className="text-primary" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium mb-1">Create Flowchart</h4>
                                <p className="text-secondary text-sm">Build a flowchart from your ideas</p>
                            </div>
                        </div>
                    </button>

                    <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-start gap-2 mb-2">
                            <FileText size={16} className="text-primary mt-0.5" />
                            <h5 className="text-white text-sm font-medium">How to use</h5>
                        </div>
                        <ul className="text-secondary text-xs space-y-1 ml-6">
                            <li>• Select text in the writing area</li>
                            <li>• Click a tool to create diagram</li>
                            <li>• View branches in this panel</li>
                        </ul>
                    </div>

                    {/* Existing Branches */}
                    {branches.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-white text-sm font-medium mb-3">Your Branches</h4>
                            <div className="space-y-2">
                                {branches.map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => { setCurrentBranch(branch); setView('view-branch'); }}
                                        className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 rounded-lg p-3 text-left transition-all"
                                    >
                                        <p className="text-white text-sm font-medium truncate">{branch.sourceText}</p>
                                        <p className="text-secondary text-xs mt-1">{branch.branches.length} branches</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Create Branch/Flowchart View
    if (view === 'create-branch' || view === 'create-flowchart') {
        return (
            <div className="h-full w-full bg-[#0f0f0f] border-l border-white/10 p-6 overflow-y-auto">
                <button
                    onClick={() => setView('tools')}
                    className="flex items-center gap-2 text-secondary hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm">Back to Tools</span>
                </button>

                <h3 className="text-white font-semibold mb-2">
                    {view === 'create-branch' ? 'Create Branch' : 'Create Flowchart'}
                </h3>

                <div className="mb-6">
                    <label className="text-secondary text-xs mb-1 block">Topic / Root Node</label>
                    <input
                        type="text"
                        value={manualRootText}
                        onChange={(e) => setManualRootText(e.target.value)}
                        placeholder="Enter main topic..."
                        className="w-full bg-[#1a1a1a] text-white px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-primary/50 text-sm"
                    />
                </div>

                {/* Branch Count Selector */}
                <div className="mb-6">
                    <label className="text-white text-sm font-medium mb-2 block">Number of branches</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => updateBranchCount(-1)}
                            className="p-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 rounded-lg transition-colors"
                        >
                            <Minus size={16} className="text-white" />
                        </button>
                        <span className="text-white text-2xl font-bold w-12 text-center">{branchCount}</span>
                        <button
                            onClick={() => updateBranchCount(1)}
                            className="p-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 rounded-lg transition-colors"
                        >
                            <Plus size={16} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Branch Labels */}
                <div className="space-y-3 mb-6">
                    {branchLabels.map((label, index) => (
                        <div key={index}>
                            <label className="text-secondary text-xs mb-1 block">Branch {index + 1}</label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => {
                                    const newLabels = [...branchLabels];
                                    newLabels[index] = e.target.value;
                                    setBranchLabels(newLabels);
                                }}
                                placeholder={`Enter branch ${index + 1} label...`}
                                className="w-full bg-[#1a1a1a] text-white px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-primary/50 text-sm"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => saveBranch(view === 'create-branch' ? 'branch' : 'flowchart')}
                    className="w-full px-4 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg text-primary font-medium transition-all"
                >
                    Create {view === 'create-branch' ? 'Branch' : 'Flowchart'}
                </button>
            </div>
        );
    }

    // View Branch
    if (view === 'view-branch' && currentBranch) {
        return (
            <div className="h-full w-full bg-[#0f0f0f] border-l border-white/10 p-6 overflow-y-auto">
                <button
                    onClick={() => setView('tools')}
                    className="flex items-center gap-2 text-secondary hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm">Back to Tools</span>
                </button>

                <h3 className="text-white font-semibold mb-2">{currentBranch.type === 'branch' ? 'Branch' : 'Flowchart'}</h3>
                <p className="text-secondary text-sm mb-6">Source: "{currentBranch.sourceText}"</p>

                {/* Visual Branch Diagram */}
                <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
                    {/* Root Node */}
                    <div className="flex flex-col items-center">
                        <div className="bg-primary/20 border border-primary/50 rounded-lg px-4 py-2 text-primary text-sm font-medium mb-6">
                            {currentBranch.sourceText}
                        </div>

                        {/* Branches */}
                        <div className="space-y-3 w-full">
                            {currentBranch.branches.map((branch, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-8 h-px bg-primary/30"></div>
                                    <div className="flex-1 bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                                        {branch || `Branch ${index + 1}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
