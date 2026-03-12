import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp, GripVertical, FileText } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

// ── Types ─────────────────────────────────────────────────────────────────

type PhaseStatus = 'planned' | 'active' | 'done';

interface Phase {
    id: string;
    name: string;
    timeframe: string;
    description: string;
    status: PhaseStatus;
}

interface StructuredTimeline {
    format: 'structured';
    phases: Phase[];
    notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function parseContent(raw: string): StructuredTimeline {
    if (!raw) return { format: 'structured', phases: [], notes: '' };
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.format === 'structured') return parsed as StructuredTimeline;
    } catch { /* fall through */ }
    // Legacy plain-text → migrate into notes
    return { format: 'structured', phases: [], notes: raw };
}

function serialise(data: StructuredTimeline): string {
    return JSON.stringify(data);
}

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

const STATUS_META: Record<PhaseStatus, { label: string; icon: React.ElementType; dot: string; badge: string }> = {
    planned: {
        label: 'Planned',
        icon: Circle,
        dot: 'bg-white/20',
        badge: 'bg-white/[0.06] text-white/40 border-white/[0.08]',
    },
    active: {
        label: 'In Progress',
        icon: Clock,
        dot: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
        badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    done: {
        label: 'Done',
        icon: CheckCircle2,
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
};

// ── Phase card ─────────────────────────────────────────────────────────────

interface PhaseCardProps {
    phase: Phase;
    index: number;
    total: number;
    onUpdate: (id: string, patch: Partial<Phase>) => void;
    onDelete: (id: string) => void;
}

function PhaseCard({ phase, index, total, onUpdate, onDelete }: PhaseCardProps) {
    const [expanded, setExpanded] = useState(true);
    const [editingField, setEditingField] = useState<string | null>(null);
    const meta = STATUS_META[phase.status];
    const StatusIcon = meta.icon;

    const cycleStatus = () => {
        const order: PhaseStatus[] = ['planned', 'active', 'done'];
        const next = order[(order.indexOf(phase.status) + 1) % order.length];
        onUpdate(phase.id, { status: next });
    };

    return (
        <div className="flex gap-3 md:gap-5 group/phase">
            {/* Timeline spine */}
            <div className="flex flex-col items-center shrink-0 pt-1">
                <button
                    onClick={cycleStatus}
                    title={`Status: ${meta.label} — click to cycle`}
                    className="w-3 h-3 rounded-full shrink-0 transition-all duration-300 hover:scale-125 active:scale-95"
                    style={{ zIndex: 1 }}
                >
                    <div className={`w-3 h-3 rounded-full ${meta.dot} transition-all duration-300`} />
                </button>
                {index < total - 1 && (
                    <div className="w-px flex-1 mt-2 bg-gradient-to-b from-white/[0.08] to-white/[0.03]" style={{ minHeight: 32 }} />
                )}
            </div>

            {/* Card */}
            <div className="flex-1 mb-6 md:mb-8 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden transition-all hover:border-white/[0.1]">
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                            <GripVertical size={13} className="text-white/15 opacity-0 group-hover/phase:opacity-100 transition-opacity" />
                        </div>
                        <div className="min-w-0 flex-1">
                            {editingField === 'name' ? (
                                <input
                                    autoFocus
                                    className="w-full bg-transparent text-white font-black text-sm outline-none border-b border-primary/40 pb-0.5 placeholder-white/20"
                                    value={phase.name}
                                    placeholder="Phase name…"
                                    onChange={e => onUpdate(phase.id, { name: e.target.value })}
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={e => { if (e.key === 'Enter') setEditingField(null); e.stopPropagation(); }}
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className="font-black text-sm text-white hover:text-primary transition-colors"
                                    onDoubleClick={e => { e.stopPropagation(); setEditingField('name'); }}
                                    title="Double-click to edit"
                                >
                                    {phase.name || <span className="text-white/20 italic font-normal text-xs">Untitled phase</span>}
                                </span>
                            )}

                            {editingField === 'timeframe' ? (
                                <input
                                    autoFocus
                                    className="mt-0.5 w-full bg-transparent text-white/50 text-[11px] outline-none border-b border-white/20 pb-0.5 placeholder-white/20"
                                    value={phase.timeframe}
                                    placeholder="e.g. Week 1–2 · Jan 10–24"
                                    onChange={e => onUpdate(phase.id, { timeframe: e.target.value })}
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={e => { if (e.key === 'Enter') setEditingField(null); e.stopPropagation(); }}
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <p
                                    className="text-[11px] text-white/30 mt-0.5 font-medium hover:text-white/50 transition-colors"
                                    onDoubleClick={e => { e.stopPropagation(); setEditingField('timeframe'); }}
                                    title="Double-click to edit"
                                >
                                    {phase.timeframe || <span className="italic text-white/15">Add timeframe…</span>}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={e => { e.stopPropagation(); cycleStatus(); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${meta.badge}`}
                        >
                            <StatusIcon size={10} />
                            {meta.label}
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(phase.id); }}
                            className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/phase:opacity-100"
                        >
                            <Trash2 size={12} />
                        </button>
                        <div className="text-white/20">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    </div>
                </div>

                {/* Expanded description */}
                {expanded && (
                    <div className="px-4 pb-4 border-t border-white/[0.04]">
                        <textarea
                            className="w-full mt-3 bg-transparent text-white/60 text-sm leading-relaxed outline-none resize-none placeholder-white/15 min-h-[60px]"
                            value={phase.description}
                            onChange={e => onUpdate(phase.id, { description: e.target.value })}
                            placeholder="Describe what happens in this phase, milestones, deliverables…"
                            spellCheck={false}
                            rows={3}
                            onKeyDown={e => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TimelineSection() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[id || '']);
    const updateCanvasTimeline = useStore(state => state.updateCanvasTimeline);

    const [data, setData] = useState<StructuredTimeline>({ format: 'structured', phases: [], notes: '' });
    const [notesOpen, setNotesOpen] = useState(false);

    useEffect(() => {
        if (canvas) setData(parseContent(canvas.timelineContent || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvas?.timelineContent]);

    useEffect(() => {
        if (canvas?.name) document.title = `Timeline — ${canvas.name} | Stratabin`;
        return () => { document.title = 'Stratabin AI — Strategy Workspace'; };
    }, [canvas?.name]);

    const save = useCallback((next: StructuredTimeline) => {
        setData(next);
        updateCanvasTimeline(id!, serialise(next));
    }, [id, updateCanvasTimeline]);

    const addPhase = () => {
        const next: StructuredTimeline = {
            ...data,
            phases: [...data.phases, { id: uid(), name: '', timeframe: '', description: '', status: 'planned' }],
        };
        save(next);
    };

    const updatePhase = (phaseId: string, patch: Partial<Phase>) => {
        const next: StructuredTimeline = {
            ...data,
            phases: data.phases.map(p => p.id === phaseId ? { ...p, ...patch } : p),
        };
        save(next);
    };

    const deletePhase = (phaseId: string) => {
        const next: StructuredTimeline = { ...data, phases: data.phases.filter(p => p.id !== phaseId) };
        save(next);
    };

    if (!canvas) return (
        <div className="flex items-center justify-center h-screen bg-[#050505] text-white/40 text-sm">
            Project not found
        </div>
    );

    const done = data.phases.filter(p => p.status === 'done').length;
    const active = data.phases.filter(p => p.status === 'active').length;
    const total = data.phases.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div className="w-screen h-screen bg-[#050505] text-white flex overflow-hidden">
            <Sidebar canvasId={id} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <div className="h-13 md:h-16 border-b border-white/[0.04] flex items-center px-3 md:px-6 gap-2 shrink-0 bg-[#060606]/95 backdrop-blur-2xl">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="md:hidden p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] text-white/25 font-black uppercase tracking-[0.2em] leading-none mb-0.5 hidden sm:block">Timeline</p>
                        <h1 className="text-[13px] md:text-base font-black truncate text-white">
                            {canvas.name || canvas.title || 'Untitled'}
                        </h1>
                    </div>

                    {/* Progress pill */}
                    {total > 0 && (
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-[11px] font-black text-white/40">{pct}%</span>
                            </div>
                            {active > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-orange-400">{active} active</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={addPhase}
                        className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-primary/10 text-primary border border-primary/25 rounded-xl font-black text-[11px] md:text-xs uppercase tracking-wider hover:bg-primary/20 active:scale-95 transition-all shrink-0 shadow-[0_2px_12px_rgba(249,115,22,0.12)]"
                    >
                        <Plus size={13} strokeWidth={3} />
                        <span className="hidden sm:inline">Add Phase</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-12">

                        {/* Stats row */}
                        {total > 0 && (
                            <div className="flex items-center gap-3 mb-8 flex-wrap">
                                {[
                                    { label: 'Total', value: total, color: 'text-white/60' },
                                    { label: 'Done', value: done, color: 'text-emerald-400' },
                                    { label: 'Active', value: active, color: 'text-orange-400' },
                                    { label: 'Planned', value: total - done - active, color: 'text-white/30' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                                        <span className={`text-sm font-black ${color}`}>{value}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">{label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Phases */}
                        {data.phases.length > 0 ? (
                            <div>
                                {data.phases.map((phase, i) => (
                                    <PhaseCard
                                        key={phase.id}
                                        phase={phase}
                                        index={i}
                                        total={data.phases.length}
                                        onUpdate={updatePhase}
                                        onDelete={deletePhase}
                                    />
                                ))}

                                {/* End node */}
                                <div className="flex gap-3 md:gap-5 mb-8">
                                    <div className="flex flex-col items-center shrink-0 pt-1">
                                        <div className="w-3 h-3 rounded-full border-2 border-dashed border-white/[0.15]" />
                                    </div>
                                    <button
                                        onClick={addPhase}
                                        className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-white/[0.08] text-white/25 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.04] transition-all text-sm font-bold"
                                    >
                                        <Plus size={14} />
                                        Add next phase
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
                                    <div className="flex flex-col gap-1.5 items-center">
                                        <div className="w-2 h-2 rounded-full bg-white/20" />
                                        <div className="w-px h-4 bg-white/10" />
                                        <div className="w-2 h-2 rounded-full bg-white/10" />
                                    </div>
                                </div>
                                <h3 className="text-base font-black text-white/50 mb-2">No phases yet</h3>
                                <p className="text-sm text-white/25 max-w-xs leading-relaxed mb-8">
                                    Break your project into phases — each with a name, timeframe, and status.
                                </p>
                                <button
                                    onClick={addPhase}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/25 rounded-2xl font-black text-sm hover:bg-primary/20 active:scale-95 transition-all"
                                >
                                    <Plus size={15} />
                                    Add first phase
                                </button>
                            </div>
                        )}

                        {/* Notes section */}
                        <div className="border-t border-white/[0.05] pt-6">
                            <button
                                onClick={() => setNotesOpen(o => !o)}
                                className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors mb-4 w-full text-left"
                            >
                                <FileText size={13} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    Notes & Free-form Plan
                                </span>
                                {notesOpen ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                            </button>

                            {notesOpen && (
                                <textarea
                                    value={data.notes}
                                    onChange={e => save({ ...data, notes: e.target.value })}
                                    placeholder="Any free-form timeline notes, dependencies, or context…"
                                    className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-sm text-white/60 leading-relaxed outline-none focus:border-primary/20 transition-colors resize-none placeholder-white/15 min-h-[120px]"
                                    spellCheck={false}
                                    onKeyDown={e => e.stopPropagation()}
                                />
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {id && <MobileNav canvasId={id} />}
        </div>
    );
}
