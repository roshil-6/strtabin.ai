import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Check, Zap, ArrowRight, Bot, X, Compass, Target, Rocket, Layout, PenTool, Calendar, GitBranch, FolderOpen, Layers, Sparkles, Users, ChevronDown, Gift, Smartphone } from 'lucide-react';

import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';

export default function LandingPage() {
    const navigate = useNavigate();
    const { isSignedIn, isLoaded: authLoaded } = useAuth();
    const [showHowTo, setShowHowTo] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const isLoaded = authLoaded;

    useEffect(() => {
        if (authLoaded && isSignedIn) {
            navigate('/dashboard', { replace: true });
        }
    }, [authLoaded, isSignedIn, navigate]);

    useEffect(() => {
        if (window.location.hash === '#pricing') {
            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    const faqs = [
        {
            q: "What is Stratabin and how does the AI strategy planning work?",
            a: "Stratabin is an AI workspace and strategy planner for ideas. Notes, flows, and STRAB AI help you unscatter your thoughts and turn them into execution plans. STRAB AI analyzes your canvas, writing, and project structure to provide context-aware insights and suggest next steps."
        },
        {
            q: "Is Stratabin free to use?",
            a: "Yes. Stratabin is free to use — create an account with email or username and password. STRAB AI has a generous daily limit per account to keep the service sustainable for everyone."
        },
        {
            q: "Can I use Stratabin on my phone or tablet?",
            a: "Absolutely. Stratabin is a Progressive Web App (PWA) that installs on any device — iPhone, Android, tablet, or desktop. It works offline and provides a native app-like experience with touch-optimized controls."
        },
        {
            q: "How is Stratabin different from Notion, Miro, or Trello?",
            a: "Unlike task-only tools (Trello) or document tools (Notion) or whiteboard tools (Miro), Stratabin unifies all three: a distraction-free writing editor, an interactive flow canvas for visual mapping, and integrated task management — all powered by AI that understands your strategy context."
        },
        {
            q: "Can I work with a team or share my projects?",
            a: "Yes. Create Team Workspaces to invite members via email or username. Share public projects in the community feed, track execution streaks, and build strategies together. Individual workspaces stay private; team workspaces support roles (admin/member) and visibility (private/public)."
        },
        {
            q: "Can I merge or connect multiple strategy projects?",
            a: "Yes. Stratabin's project merging feature combines multiple canvases into a unified view. You can also use Folder Workflow Maps to visualize relationships between projects in the same workspace."
        },
        {
            q: "What can STRAB AI actually do?",
            a: "STRAB AI reads your entire project context — nodes, writing, tasks, timelines — and provides strategic analysis, gap identification, progress reports, and actionable recommendations. It's a strategy co-pilot, not just a chatbot."
        },
    ];

    return (
        <div className={`min-h-screen theme-page font-sans selection:bg-white/20 relative ${showHowTo ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
            <HexagonBackground />

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] theme-panel backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/10">
                            <img src="/favicon.png" alt="Stratabin — AI workspace and strategy planner for ideas" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></span>
                    </div>
                    <nav className="flex items-center gap-2 md:gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => setShowHowTo(true)}
                            className="text-xs md:text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5 flex items-center"
                        >
                            How it Works
                        </button>
                        <Link
                            to="/features"
                            className="hidden md:flex text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5 items-center"
                        >
                            Features
                        </Link>
                        <Link
                            to="/#pricing"
                            onClick={(e) => {
                                if (window.location.pathname === '/') {
                                    e.preventDefault();
                                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="flex text-xs md:text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5 items-center"
                        >
                            Free access
                        </Link>
                        <button
                            onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                            className="hidden md:flex text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5 items-center"
                        >
                            FAQ
                        </button>
                        {isSignedIn ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all text-sm"
                            >
                                Go to Dashboard
                                <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/auth')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all text-sm"
                            >
                                Sign in
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            {/* H1 Hero — primary keyword in first 100 words */}
            <section id="hero-cta" className="pt-32 md:pt-40 pb-16 md:pb-20 px-4 md:px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-10 flex justify-center animate-in fade-in zoom-in duration-1000">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/5">
                            <img src="/favicon.png" alt="Stratabin — AI workspace and strategy planner for ideas" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-primary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <Zap size={13} />
                        AI Workspace & Strategy Planner for Ideas
                    </div>

                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 break-words">
                        Unscatter your ideas. <br />
                        <span className="text-white/40">Notes, flows, and AI.</span>
                    </h1>

                    <p className="text-base md:text-xl text-white/40 max-w-2xl mx-auto mb-6 leading-relaxed font-medium px-2">
                        Stratabin is the AI workspace and strategy planner for ideas. Notes, flows, and STRAB AI — unscatter your thoughts and turn them into execution plans.
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-10 md:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        <Users size={13} />
                        Now with Team Workspaces — Build & execute together
                    </div>

                    {/* Demo Video */}
                    <div className="w-full max-w-3xl mx-auto mb-10 md:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl aspect-video">
                            <video
                                src="/strtabin%20ad%203.mp4"
                                controls
                                playsInline
                                className="w-full h-full object-contain"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <p className="text-center text-white/30 text-xs mt-3 font-medium">See Stratabin in action</p>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
                        <div className="px-3 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-primary flex items-center gap-2">
                            <Zap size={10} fill="currentColor" />
                            For Students & Professionals
                        </div>
                    </div>

                    <div className="scroll-mt-24">
                    {!isLoaded ? (
                        <div className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl animate-pulse mx-auto w-fit">
                            <div className="w-5 h-5 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                            <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Checking access...</span>
                        </div>
                    ) : isSignedIn ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group relative flex items-center gap-3 px-7 md:px-8 py-3.5 md:py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all shadow-[0_4px_30px_rgba(255,119,86,0.3)] active:scale-95 mx-auto text-sm md:text-base"
                        >
                            <Zap size={18} fill="currentColor" />
                            Go to Dashboard
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/auth')}
                            className="group relative flex items-center gap-3 px-7 md:px-8 py-3.5 md:py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all shadow-[0_4px_30px_rgba(255,119,86,0.3)] active:scale-95 mx-auto text-sm md:text-base"
                        >
                            <Zap size={18} fill="currentColor" />
                            Get Started
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                    </div>
                </div>
            </section>

            {/* H2 — What is Stratabin / Problem-Solution */}
            <section className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6 md:mb-8">
                        <Sparkles size={12} />
                        The Problem We Solve
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-8 md:mb-10 px-2">
                        "Visualize your <span className="text-primary italic">scattered ideas</span>, then execute them with precision using a <span className="italic underline underline-offset-8 decoration-primary/30">structured roadmap</span> built for speed."
                    </h2>
                    <p className="text-sm md:text-base text-white/30 max-w-xl mx-auto leading-relaxed mb-8">
                        Most strategy tools either help you brainstorm or help you manage tasks — never both. Stratabin bridges ideation and execution in a single AI-powered workspace, so nothing falls through the cracks.
                    </p>
                    <button
                        onClick={() => setShowHowTo(true)}
                        className="group inline-flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-widest text-primary hover:text-white transition-all"
                    >
                        Learn the Methodology
                        <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                </div>
            </section>

            {/* H2 — Key Features with semantic keywords */}
            <section className="py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12 md:mb-16">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">Everything You Need to Plan and Execute</h2>
                        <p className="text-white/30 text-sm md:text-base">A complete strategy workspace — not just another project management tool.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {[
                            { icon: PenTool, title: "Distraction-Free Writing", desc: "Long-form writing editor with split view, branch creation, and a collapsible planner for deep strategic thinking." },
                            { icon: Layout, title: "Interactive Flow Canvas", desc: "Drag-and-drop visual canvas to map ideas as nodes, connect strategies, and see the big picture at a glance." },
                            { icon: Bot, title: "STRAB AI Intelligence", desc: "Context-aware AI that analyzes your entire project — nodes, writing, tasks — and provides strategic insights and gap analysis." },
                            { icon: GitBranch, title: "Branch & Merge Ideas", desc: "Split one idea into multiple branches, or merge separate strategy canvases into a unified project overview." },
                            { icon: Calendar, title: "Calendar & Timeline", desc: "Built-in calendar with event reminders and a timeline planner tied directly to your strategy projects." },
                            { icon: FolderOpen, title: "Folder Workspaces", desc: "Organize projects into custom folders with dedicated workflow maps showing inter-project relationships." },
                            { icon: Users, title: "Team & Social Workspaces", desc: "Create team workspaces, invite members, share public projects, and build together. Streaks and progress scoring keep everyone accountable." },
                            { icon: Layers, title: "Project Merging", desc: "Combine multiple strategy canvases into one master view with tabbed sub-projects for complex initiatives." },
                            { icon: Sparkles, title: "Task Management", desc: "Integrated to-do lists for every project. Track progress alongside your strategy, not in a separate tool." },
                            { icon: Zap, title: "Works Everywhere", desc: "Progressive Web App that installs on phones, tablets, and desktops. Touch-optimized mobile interface with offline support." },
                        ].map((feat, i) => (
                            <div key={i} className="group p-5 md:p-7 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:border-primary/20 hover:bg-white/[0.03] transition-all duration-300">
                                <feat.icon size={22} className="text-primary mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-sm md:text-base font-black text-white mb-2">{feat.title}</h3>
                                <p className="text-white/30 text-xs md:text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* H2 — How It Works (Step-by-step) */}
            <section className="py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12 md:mb-20">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-3">How Stratabin Works</h2>
                        <p className="text-white/30 text-sm">From raw idea to structured execution in three steps.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                        {[
                            { step: "01", title: "Capture & Write", desc: "Start with your raw ideas in the writing editor. Use split view to compare angles, or branch into visual flowcharts." },
                            { step: "02", title: "Map & Organize", desc: "Drag ideas onto the flow canvas as connected nodes. Merge related projects, create folder workspaces, and let AI organize the structure." },
                            { step: "03", title: "Execute & Track", desc: "Convert strategies into tasks, set calendar deadlines, build timelines, and use STRAB AI reports to monitor progress and identify gaps." },
                        ].map((item, idx) => (
                            <div key={idx} className="relative group">
                                <div className="absolute -top-8 -left-4 text-8xl md:text-9xl font-black text-white/[0.02] pointer-events-none group-hover:text-primary/[0.06] transition-colors">{item.step}</div>
                                <div className="p-7 md:p-10 bg-white/[0.02] border border-white/[0.04] rounded-3xl hover:border-primary/20 transition-all relative z-10 h-full flex flex-col">
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-white/[0.04] rounded-xl flex items-center justify-center text-primary mb-6 md:mb-8 group-hover:bg-primary group-hover:text-black transition-all text-lg md:text-xl font-black">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black mb-4">{item.title}</h3>
                                    <p className="text-white/35 leading-relaxed text-sm md:text-base">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* H2 — Free access */}
            <section id="pricing" className="py-16 md:py-28 px-4 md:px-6 relative overflow-hidden">
                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] md:text-xs font-black uppercase tracking-widest mb-5 md:mb-6">
                            <Gift size={14} className="shrink-0" />
                            Full workspace — $0
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4 md:mb-5 leading-[1.1]">
                            Everything you need to plan{' '}
                            <span className="text-white/35">and ship</span>
                        </h2>
                        <p className="text-white/40 text-sm md:text-base leading-relaxed">
                            One account unlocks canvases, STRAB AI, team workspaces, and your calendar — no tiers, no timer, no card on file.
                        </p>
                    </div>

                    <div className="relative rounded-[1.75rem] md:rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-px shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
                        <div className="relative rounded-[1.65rem] md:rounded-[1.85rem] bg-[var(--bg-muted)] overflow-hidden">
                            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(218,119,86,0.12),transparent)]" aria-hidden />
                            <div className="relative z-[1] p-6 md:p-10 lg:p-12">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 lg:gap-14 mb-10 md:mb-12">
                                    <div className="lg:max-w-md">
                                        <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs mb-3">
                                            What&apos;s included
                                        </p>
                                        <p className="text-xl md:text-2xl font-black text-white leading-snug mb-3">
                                            The same tools students and teams use to turn messy ideas into executable plans.
                                        </p>
                                        <p className="text-white/45 text-sm leading-relaxed">
                                            STRAB AI uses a fair daily limit per account so the service stays fast and available for everyone.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 lg:justify-end lg:pt-1">
                                        {['No paywall', 'No trial expiry', 'Sign in with email or username'].map((label) => (
                                            <span
                                                key={label}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] md:text-xs font-semibold text-white/70"
                                            >
                                                <Check size={12} className="text-primary shrink-0" strokeWidth={3} />
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-10 md:mb-12">
                                    {[
                                        { icon: Layout, title: 'Strategy canvases', desc: 'Unlimited flow maps and project boards' },
                                        { icon: Bot, title: 'STRAB AI', desc: 'Project-aware assistant with a daily usage cap' },
                                        { icon: Users, title: 'Team workspaces', desc: 'Invite people, share visibility, collaborate' },
                                        { icon: FolderOpen, title: 'Folder maps', desc: 'See how folders and projects connect' },
                                        { icon: PenTool, title: 'Writing & tasks', desc: 'Long-form notes plus integrated to-dos' },
                                        { icon: Smartphone, title: 'Install anywhere', desc: 'PWA on phone, tablet, and desktop' },
                                    ].map(({ icon: Icon, title, desc }) => (
                                        <div
                                            key={title}
                                            className="group flex gap-4 p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/25 hover:bg-white/[0.05] transition-all duration-300"
                                        >
                                            <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                                                <Icon size={20} strokeWidth={2} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-white text-sm md:text-base mb-0.5 leading-tight">{title}</h3>
                                                <p className="text-white/40 text-xs md:text-[13px] leading-relaxed">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => (isSignedIn ? navigate('/dashboard') : navigate('/auth'))}
                                        className="group flex-1 sm:flex-initial sm:min-w-[240px] flex items-center justify-center gap-3 py-4 px-8 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-[0_12px_40px_rgba(218,119,86,0.2)] active:scale-[0.98]"
                                    >
                                        <Zap size={18} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                                        {isSignedIn ? 'Open dashboard' : 'Get started free'}
                                        <ArrowRight size={16} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                    <Link
                                        to="/features"
                                        className="text-center sm:text-left text-sm font-bold text-white/35 hover:text-primary transition-colors py-2"
                                    >
                                        Browse all features →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* H2 — FAQ Section (Schema-backed) */}
            <section id="faq" className="py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10 md:mb-14">
                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter mb-3">Frequently Asked Questions</h2>
                        <p className="text-white/30 text-sm">Everything you need to know about Stratabin.</p>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-white/[0.04] rounded-2xl overflow-hidden bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 md:py-5 text-left"
                                >
                                    <span className="text-sm md:text-base font-bold text-white/80">{faq.q}</span>
                                    <ChevronDown size={16} className={`text-white/25 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 md:px-6 pb-5 md:pb-6 animate-in slide-in-from-top-1 fade-in duration-200">
                                        <p className="text-xs md:text-sm text-white/40 leading-relaxed">{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer with semantic links */}
            <footer className="border-t border-white/[0.04] py-10 md:py-14 px-4 md:px-6">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                            <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-black tracking-tighter text-white/60">Stratabin</span>
                    </div>
                    <p className="text-[11px] text-white/15 text-center md:text-left">
                        AI workspace and strategy planner for ideas. Notes, flows, STRAB AI, and team workspaces.
                    </p>
                    <p className="text-[11px] text-white/10">&copy; {new Date().getFullYear()} Stratabin. All rights reserved.</p>
                </div>
            </footer>

            {/* How to Use Overlay */}
            {showHowTo && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl overflow-y-auto animate-in fade-in zoom-in duration-500">
                    <button
                        onClick={() => setShowHowTo(false)}
                        className="fixed top-6 right-6 md:top-8 md:right-8 z-[110] w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-black transition-all group active:scale-95"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                    </button>

                    <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-24">
                        <div className="mb-24 md:mb-40">
                            <div className="flex items-center gap-3 md:gap-4 mb-10 md:mb-12">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                                    <Target size={28} />
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Why Stratabin?</h2>
                                    <p className="text-primary font-bold uppercase tracking-[0.15em] text-[10px] md:text-xs">The Problem We Resolve</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
                                {[
                                    { title: "Mental Clarity", desc: "Scattered thoughts lead to wasted potential. Stratabin provides the visual canvas to offload your brain and see connections you've been missing.", icon: Compass },
                                    { title: "Structured Execution", desc: "Ideas are cheap; execution is everything. We turn abstract strategies into technical roadmaps and actionable task lists automatically.", icon: Target },
                                    { title: "Accelerated Growth", desc: "Built for speed. STRAB AI lets you map complex topics in minutes that used to take hours of manual research and planning.", icon: Rocket },
                                ].map((item, i) => (
                                    <div key={i} className="p-7 md:p-10 bg-white/[0.02] border border-white/[0.04] rounded-3xl hover:border-primary/20 transition-all group">
                                        <item.icon size={32} className="text-primary mb-6 group-hover:scale-110 transition-transform" />
                                        <h3 className="text-xl md:text-2xl font-black mb-3">{item.title}</h3>
                                        <p className="text-white/35 leading-relaxed text-sm">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-24 md:mb-40">
                            <div className="text-center mb-16 md:mb-24">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">The Methodology</h2>
                                <div className="w-24 md:w-32 h-1.5 bg-primary mx-auto rounded-full shadow-[0_4px_20px_rgba(218,119,86,0.4)]" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                                {[
                                    { step: "01", title: "Capture & Flow", description: "Map out your initial thoughts using our fluid canvas. Create nodes, link ideas, and visualize the big picture without friction.", icon: Zap },
                                    { step: "02", title: "Organize Intelligence", description: "STRAB AI automatically categorizes and structures your data. Merge related canvases or group them into dedicated workspaces.", icon: Bot },
                                    { step: "03", title: "Execute with Clarity", description: "Convert strategies into actionable task lists and timelines. Sync across all devices and track progress in real-time.", icon: Check },
                                ].map((item, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="absolute -top-8 -left-4 text-8xl md:text-9xl font-black text-white/[0.02] pointer-events-none group-hover:text-primary/[0.06] transition-colors">{item.step}</div>
                                        <div className="p-7 md:p-10 pb-12 bg-white/[0.02] border border-white/[0.04] rounded-3xl hover:border-primary/20 transition-all relative z-10 h-full flex flex-col">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-black transition-all">
                                                <item.icon size={28} />
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-black mb-4">{item.title}</h3>
                                            <p className="text-white/35 leading-relaxed text-sm md:text-lg">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-7 md:p-20 bg-primary/[0.03] border border-primary/15 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-20 opacity-[0.03]">
                                <Compass size={400} />
                            </div>
                            <div className="relative z-10">
                                <div className="mb-10 md:mb-16">
                                    <h2 className="text-3xl md:text-4xl font-black mb-3">Complete Feature Directory</h2>
                                    <p className="text-white/30 uppercase tracking-widest text-[10px] md:text-xs font-bold">Every Tool at Your Fingertips</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {[
                                        { name: "Team Workspaces", desc: "Invite members, share public projects, and build strategies together." },
                                        { name: "Project Merging", desc: "Combine strategy canvases into a unified intelligence view." },
                                        { name: "Folder Workspaces", desc: "Unlimited folders to segment professional and personal work." },
                                        { name: "STRAB Intelligence", desc: "Context-aware AI insights on your strategy flows." },
                                        { name: "PWA Mobile App", desc: "Install on iOS or Android for native-like performance." },
                                        { name: "Interactive Canvas", desc: "High-performance drag-and-drop mapping canvas." },
                                        { name: "Writing Mode", desc: "Distraction-free editor for deep strategic writing." },
                                        { name: "Timeline Mapping", desc: "Plan milestones and deadlines in a visual timeline." },
                                        { name: "Task Ecosystem", desc: "Integrated to-do lists tied to strategy projects." },
                                    ].map((feat, i) => (
                                        <div key={i} className="p-5 md:p-7 bg-black/20 border border-white/[0.04] rounded-2xl hover:bg-black/30 transition-all">
                                            <h3 className="text-primary font-black text-xs uppercase tracking-[0.15em] mb-2">{feat.name}</h3>
                                            <p className="text-white/30 text-xs md:text-sm leading-relaxed">{feat.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
