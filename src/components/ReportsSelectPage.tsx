import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft, BarChart2, Layout } from 'lucide-react';

export default function ReportsSelectPage() {
    const navigate = useNavigate();
    const { canvases, activeFolderId } = useStore(useShallow(state => ({
        canvases: state.canvases,
        activeFolderId: state.activeFolderId,
    })));

    const filteredCanvases = Object.values(canvases).filter(
        p => (p.folderId || null) === activeFolderId
    );

    return (
        <div className="min-h-screen theme-page text-white flex flex-col">
            <header className="flex-shrink-0 border-b border-white/[0.06] px-4 md:px-8 py-4 md:py-6 flex items-center gap-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-black tracking-tight">STRAB AI Reports</h1>
                    <p className="text-xs text-white/40 mt-0.5 uppercase tracking-widest font-bold">Select project to see the report</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-8 md:py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col items-center text-center mb-10 md:mb-14">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                            <BarChart2 size={32} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Select project to see the report</h2>
                        <p className="text-sm text-white/40 max-w-md">
                            Choose a project below to view AI analysis, gap identification, and actionable recommendations.
                        </p>
                    </div>

                    {filteredCanvases.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {filteredCanvases.map(p => {
                                const name = (p.title || p.name || '').trim();
                                const displayName = !name || /^untitled(\s+project)?$/i.test(name) ? 'Name your project' : name;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => navigate(`/strab/${p.id}?tab=reports`)}
                                        className="group text-left p-5 md:p-6 rounded-2xl border border-white/[0.08] hover:border-emerald-500/40 bg-white/[0.02] hover:bg-emerald-500/[0.06] transition-all active:scale-[0.99]"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                <Layout size={20} className="text-emerald-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-bold text-white truncate">{displayName}</h3>
                                                <p className="text-xs text-white/40 mt-0.5">View report →</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02]">
                            <p className="text-white/50 font-bold">No projects in this workspace</p>
                            <p className="text-sm text-white/35 mt-1">Create a project from the dashboard first.</p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="mt-4 px-5 py-2.5 bg-primary/10 text-primary border border-primary/25 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
