import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import {
    Target, Map, CheckSquare, Code2, LineChart, Bot,
    ChevronRight, ChevronLeft, Sparkles, Zap, ArrowRight, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Step definitions
───────────────────────────────────────────── */
const STEPS = [
    {
        id: 'goal',
        num: '01',
        label: 'Goal',
        icon: Target,
        color: '#a855f7',
        glow: 'rgba(168,85,247,0.2)',
        border: 'rgba(168,85,247,0.4)',
        placeholder: 'What do you want to achieve? (e.g. "Start a car brand", "Build a SaaS product")',
        question: 'What is the main goal of this project?',
        hint: 'Be as specific or high-level as you want — AI will dig deeper in the chat.',
    },
    {
        id: 'plan',
        num: '02',
        label: 'Plan',
        icon: Map,
        color: '#3b82f6',
        glow: 'rgba(59,130,246,0.2)',
        border: 'rgba(59,130,246,0.4)',
        placeholder: 'What is the context or industry? (e.g. "Electric vehicles in India", "B2B SaaS for HR teams")',
        question: 'What\'s the context or market?',
        hint: 'This helps the AI understand your domain and ask smarter questions.',
    },
    {
        id: 'tasks',
        num: '03',
        label: 'First Steps',
        icon: CheckSquare,
        color: '#22c55e',
        glow: 'rgba(34,197,94,0.2)',
        border: 'rgba(34,197,94,0.4)',
        placeholder: 'What\'s the first thing you need to do? (e.g. "Research competitors", "Hire a designer")',
        question: 'What are your first steps?',
        hint: 'Even rough ideas help. The AI will refine and expand these into a task list.',
    },
    {
        id: 'execute',
        num: '04',
        label: 'Build Type',
        icon: Code2,
        color: '#f97316',
        glow: 'rgba(249,115,22,0.2)',
        border: 'rgba(249,115,22,0.4)',
        placeholder: 'What will you build? (e.g. "A website + mobile app", "Physical product", "Strategy & branding only")',
        question: 'What are you building?',
        hint: 'Helps the AI suggest the right tools and sections for your project.',
    },
    {
        id: 'track',
        num: '05',
        label: 'Success Metric',
        icon: LineChart,
        color: '#ec4899',
        glow: 'rgba(236,72,153,0.2)',
        border: 'rgba(236,72,153,0.4)',
        placeholder: 'How will you measure success? (e.g. "100 pre-orders", "£1M revenue", "Launch by December")',
        question: 'How does success look?',
        hint: 'A clear metric helps the AI set realistic milestones.',
    },
    {
        id: 'grow',
        num: '06',
        label: 'Timeline',
        icon: Sparkles,
        color: '#14b8a6',
        glow: 'rgba(20,184,166,0.2)',
        border: 'rgba(20,184,166,0.4)',
        placeholder: 'What\'s your target timeline? (e.g. "6 months MVP", "1 year to market", "No deadline yet")',
        question: 'What\'s your timeline?',
        hint: 'Optional but useful. The AI will help plan milestones accordingly.',
    },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function FlowProjectCreator() {
    const navigate = useNavigate();
    const { createCanvas } = useStore();

    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;
    const currentAnswer = answers[step.id] || '';
    const completedSteps = STEPS.filter((s) => (answers[s.id] || '').trim().length > 0).length;

    useEffect(() => {
        // Focus textarea on desktop, but might want to avoid auto-focus on mobile to prevent keyboard popping up immediately
        if (window.innerWidth > 768) {
            textareaRef.current?.focus();
        }
        
        // Auto-scroll the active step into view so mobile users don't have to manually swipe
        const activeNode = stepRefs.current[currentStep];
        const container = scrollContainerRef.current;
        if (activeNode && container) {
            const nodeLeft = activeNode.offsetLeft;
            const nodeWidth = activeNode.offsetWidth;
            const containerWidth = container.offsetWidth;
            
            container.scrollTo({
                left: nodeLeft - containerWidth / 2 + nodeWidth / 2,
                behavior: 'smooth'
            });
        }
    }, [currentStep]);

    const goNext = () => {
        if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
    };

    const goPrev = () => {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLast) goNext();
        }
    };

    /* Build the AI kick-off message from all answers */
    const buildInitialMessage = () => {
        const lines: string[] = ['I just created a new project. Here\'s my full brief:'];
        STEPS.forEach((s) => {
            const a = answers[s.id]?.trim();
            if (a) lines.push(`• ${s.label}: ${a}`);
        });
        lines.push(
            '',
            'Please analyse this and start by asking me the most important clarifying question to help me move forward. ' +
            'Then, based on my answers above, create a canvas (nodes + connections) that maps out the core ideas and strategy for this project, ' +
            'and add 3–5 initial tasks to get me started.'
        );
        return lines.join('\n');
    };

    const handleCreateProject = async () => {
        const goal = answers['goal']?.trim();
        if (!goal) {
            toast.error('Please fill in at least your Goal before creating the project.');
            setCurrentStep(0);
            return;
        }

        setIsCreating(true);
        try {
            // Derive a sensible project name from the goal
            const projectName = goal.length > 60 ? goal.slice(0, 57) + '...' : goal;
            const newId = createCanvas(projectName, null, 'strategy');

            toast.success('Project created! Opening AI chat…');

            // Navigate to StrabView with the kick-off message as location state
            navigate(`/strab/${newId}`, {
                state: { autoMessage: buildInitialMessage() },
            });
        } catch (err) {
            console.error(err);
            toast.error('Failed to create project. Please try again.');
            setIsCreating(false);
        }
    };

    return (
        <div
            className="min-h-[100dvh] flex flex-col items-center justify-start relative overflow-hidden"
            style={{
                background: '#080808',
                backgroundImage:
                    'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(168,85,247,0.06) 0%, transparent 70%)',
            }}
        >
            {/* Top bar */}
            <div
                className="w-full h-16 flex items-center justify-between px-6 border-b border-white/[0.04] sticky top-0 z-20"
                style={{ background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)' }}
            >
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                >
                    <ChevronLeft size={18} />
                    <span className="text-sm font-semibold">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Zap size={14} className="text-primary" />
                    </div>
                    <span className="text-sm font-bold text-white/70">Flow Builder</span>
                </div>
                <div className="text-xs text-white/30 font-medium">
                    {completedSteps}/{STEPS.length} filled
                </div>
            </div>

            <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-6 md:gap-10">
                {/* ── Flow Step Nodes ── */}
                <div 
                    ref={scrollContainerRef}
                    className="w-full overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
                    style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
                >
                    <div className="flex items-center min-w-max mx-auto justify-start md:justify-center px-4 md:px-0">
                        {STEPS.map((s, idx) => {
                            const Icon = s.icon;
                            const isDone = (answers[s.id] || '').trim().length > 0;
                            const isActive = idx === currentStep;

                            return (
                                <div key={s.id} className="flex items-center">
                                    <button
                                        ref={(el) => (stepRefs.current[idx] = el)}
                                        onClick={() => setCurrentStep(idx)}
                                        className="group relative flex flex-col items-center gap-2 w-[95px] md:w-[130px] p-3 md:p-4 rounded-2xl border transition-all duration-200 active:scale-95"
                                        style={{
                                            background: isActive
                                                ? `${s.glow}`
                                                : isDone
                                                    ? 'rgba(255,255,255,0.04)'
                                                    : 'rgba(255,255,255,0.02)',
                                            borderColor: isActive
                                                ? s.border
                                                : isDone
                                                    ? 'rgba(255,255,255,0.1)'
                                                    : 'rgba(255,255,255,0.06)',
                                            boxShadow: isActive
                                                ? `0 0 32px ${s.glow}, 0 0 0 1px ${s.border}`
                                                : 'none',
                                        }}
                                    >
                                        <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: isActive ? s.color : 'rgba(255,255,255,0.25)' }}>
                                            {s.num}
                                        </div>
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center border relative"
                                            style={{
                                                background: isActive ? `${s.glow}` : 'rgba(255,255,255,0.04)',
                                                borderColor: isActive ? s.border : 'rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            {isDone && !isActive ? (
                                                <Check size={16} style={{ color: s.color }} />
                                            ) : (
                                                <Icon size={16} style={{ color: isActive ? s.color : 'rgba(255,255,255,0.4)' }} />
                                            )}
                                        </div>
                                        <div className="text-[10px] md:text-[11px] font-bold text-center leading-tight md:leading-normal" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                                            {s.label}
                                        </div>

                                        {/* Active bottom glow */}
                                        {isActive && (
                                            <div
                                                className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full"
                                                style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }}
                                            />
                                        )}
                                    </button>

                                    {/* Connector */}
                                    {idx < STEPS.length - 1 && (
                                        <div className="flex items-center w-6 md:w-12 shrink-0">
                                            <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                            <ChevronRight size={12} className="text-white/20 shrink-0" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Active Step Input ── */}
                <div
                    className="w-full rounded-3xl p-6 md:p-8 border flex flex-col gap-6 transition-all duration-300"
                    style={{
                        background: 'linear-gradient(145deg, #121212 0%, #0e0e0e 100%)',
                        borderColor: step.border,
                        boxShadow: `0 0 60px ${step.glow}, 0 1px 0 rgba(255,255,255,0.04) inset`,
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: step.glow, border: `1px solid ${step.border}` }}
                        >
                            <step.icon size={22} style={{ color: step.color }} />
                        </div>
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-widest mb-0.5" style={{ color: step.color }}>
                                Step {step.num}
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{step.question}</h2>
                        </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={currentAnswer}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        placeholder={step.placeholder}
                        rows={4}
                        className="w-full rounded-2xl resize-none text-white/90 text-sm md:text-base leading-relaxed placeholder:text-white/20 outline-none focus:ring-0 border transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderColor: currentAnswer.trim() ? step.border : 'rgba(255,255,255,0.07)',
                            padding: '1rem 1.25rem',
                            fontFamily: 'inherit',
                        }}
                    />

                    {/* Hint */}
                    <p className="text-white/30 text-sm flex items-start gap-2">
                        <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: step.color }} />
                        {step.hint}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        {currentStep > 0 && (
                            <button
                                onClick={goPrev}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}

                        {!isLast ? (
                            <button
                                onClick={goNext}
                                className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                                style={{
                                    background: step.color,
                                    color: '#fff',
                                    boxShadow: `0 4px 20px ${step.glow}`,
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateProject}
                                disabled={isCreating}
                                className="ml-auto flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 rounded-xl font-black text-[12px] md:text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex-1 md:flex-none"
                                style={{
                                    background: isCreating
                                        ? 'rgba(249,115,22,0.5)'
                                        : 'linear-gradient(135deg, #f97316, #f59e0b)',
                                    color: '#0a0a0a',
                                    boxShadow: isCreating ? 'none' : '0 4px 24px rgba(249,115,22,0.4)',
                                }}
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    <>
                                        <Bot size={16} />
                                        <span className="hidden md:inline">Create Project &amp; Start AI Chat</span>
                                        <span className="md:hidden">Create &amp; Start Chat</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Summary Preview of Filled Steps ── */}
                {completedSteps > 0 && (
                    <div className="rounded-2xl border border-white/[0.05] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Bot size={14} className="text-primary" />
                            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">AI will receive this brief</span>
                        </div>
                        <div className="space-y-2">
                            {STEPS.filter((s) => (answers[s.id] || '').trim()).map((s) => (
                                <div key={s.id} className="flex gap-3 text-sm">
                                    <span className="font-bold shrink-0" style={{ color: s.color }}>{s.label}:</span>
                                    <span className="text-white/60 line-clamp-1">{answers[s.id]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
