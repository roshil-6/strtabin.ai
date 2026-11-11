import { publicFaqs, publicPages, topicPaths } from '../content/publicContent';
import { guideGroups } from '../content/featureGuide';
const GUIDE_TOOLS = guideGroups.flatMap(group => group.tools);
const GUIDE_TOOL_COUNT = GUIDE_TOOLS.length;
const LANDING_SPOTLIGHT = ['screenshot-to-writing', 'calendar', 'board', 'sasha', 'in-app-reports', 'workspaces'].map(id => GUIDE_TOOLS.find(tool => tool.id === id)!).filter(Boolean);
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, Bot, X, Compass, Target, Rocket, PenTool, GitBranch, Layers, Users, ChevronDown, Network, FileText, CheckSquare, Lightbulb, Star } from 'lucide-react';

import { enableGuestMode } from '../constants';
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';
import PricingSection from './PricingSection';

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

    const faqs = publicFaqs;

    return (
        <div className={`min-h-[100dvh] theme-page font-sans selection:bg-white/20 relative ${showHowTo ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
            <HexagonBackground />

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] theme-panel backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-transparent rounded-xl flex items-center justify-center overflow-hidden shadow-lg ">
                            <img src="/stratabin-icon.svg" alt="Stratabin logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></span>
                    </div>
                    <nav className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:block"><ThemeToggle /></div>
                        <button
                            onClick={() => setShowHowTo(true)}
                            className="hidden md:flex text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5 items-center"
                        >
                            How it works
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
                            Plans
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
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        enableGuestMode();
                                        navigate('/dashboard');
                                    }}
                                    className="hidden lg:inline-flex text-sm font-bold text-white/45 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
                                >
                                    Try without account
                                </button>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all text-sm"
                                >
                                    Sign in
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            </header>

            {/* H1 Hero — primary keyword in first 100 words */}
            <section id="hero-cta" className="pt-32 md:pt-40 pb-16 md:pb-20 px-4 md:px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-10 flex justify-center animate-in fade-in zoom-in duration-1000">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 bg-transparent rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/5">
                            <img src="/stratabin-icon.svg" alt="Stratabin logo" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <p className="text-sm md:text-base text-white/45 font-medium mb-5 md:mb-6">A project workspace for students, freelancers and small teams</p>

                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 break-words">
                        Unscatter your ideas. <br />
                        <span className="text-white/40">Notes, tasks, dates and AI in one place.</span>
                    </h1>

                    <p className="text-base md:text-xl text-white/40 max-w-2xl mx-auto mb-6 leading-relaxed font-medium px-2">
                        Each project gets its own pages, flow board, tasks, timeline and calendar. When you want help from ChatGPT, Claude or Gemini, Stratabin gives them the whole project in one paste, so you stop explaining it from scratch.
                    </p>

                    <div className="mb-9 md:mb-10" />

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
                            Go to Dashboard
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    enableGuestMode();
                                    navigate('/dashboard');
                                }}
                                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-white/15 text-white/80 font-bold text-sm hover:bg-white/5 transition-all"
                            >
                                Open app without sign-in
                            </button>
                            <button
                                onClick={() => navigate('/auth')}
                                className="group relative flex items-center justify-center gap-3 px-7 md:px-8 py-3.5 md:py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all shadow-[0_4px_30px_rgba(255,119,86,0.3)] active:scale-95 w-full sm:w-auto text-sm md:text-base"
                            >
                                Sign in
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                    </div>
                    
                    <p className="mt-8 text-white/35 text-xs md:text-sm font-medium px-4">
                        Free to start. Works on your phone and your laptop. <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-primary" />Team workspaces included.</span>
                    </p>
                </div>
            </section>

            {/* H2 — What is Stratabin / Problem-Solution */}
            <section className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-6 md:mb-8 px-2">
                        Most plans end up spread across <span className="text-primary">five different apps.</span>
                    </h2>
                    <p className="text-base md:text-lg text-white/45 max-w-2xl mx-auto leading-relaxed mb-8">
                        Notes in one place, a whiteboard in another, tasks in a third, and an AI chat that has never seen any of it. Stratabin keeps a project's writing, board, tasks and dates together, so the plan and the work don't drift apart.
                    </p>
                    <button
                        onClick={() => setShowHowTo(true)}
                        className="group inline-flex items-center gap-2 text-sm md:text-base font-semibold text-primary hover:text-white transition-all"
                    >
                        See how it works
                        <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                </div>
            </section>

            {/* H2 — Features: what each tool is and how it works */}
            <section id="features" className="py-16 md:py-24 px-4 md:px-6 scroll-mt-20">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12 md:mb-16">
                        <p className="text-sm font-semibold text-primary mb-3">Features</p>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Everything a project needs, in the project.</h2>
                        <p className="text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">Writing, a flow board, tasks, a calendar, a timeline and AI, all scoped to one project. These are the tools people use most.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {LANDING_SPOTLIGHT.map(tool => (
                            <article key={tool.id} className="group flex flex-col p-5 md:p-7 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-primary/25 hover:bg-white/[0.03] transition-all duration-300">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="text-base md:text-lg font-black text-white leading-snug">{tool.title}</h3>
                                    {tool.badge && <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">{tool.badge}</span>}
                                </div>
                                <p className="text-white/55 text-sm leading-relaxed mb-4">{tool.what}</p>
                                <ol className="space-y-2 mb-5">
                                    {tool.how.slice(0, 3).map((step, index) => <li key={step} className="flex gap-2.5 text-white/40 text-xs md:text-sm leading-relaxed"><span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center">{index + 1}</span><span>{step}</span></li>)}
                                </ol>
                                <Link to={`/features#${tool.id}`} className="mt-auto inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-primary hover:text-white transition-colors">How it works <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></Link>
                            </article>
                        ))}
                    </div>
                    <div className="text-center mt-10">
                        <Link to="/features" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/40 text-primary text-sm font-bold hover:bg-primary/10 transition-all">
                            Read the full guide ({GUIDE_TOOL_COUNT} tools) <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* H2 — How It Works (Step-by-step) */}
            <section className="py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12 md:mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">How it works</h2>
                        <p className="text-white/40 text-sm md:text-base">Three steps, and you never leave the project.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                        {[
                            { step: "1", title: "Write it down", desc: "Open a project and start writing. Paste screenshots of an AI chat and they turn into text. Dictate when typing is too slow." },
                            { step: "2", title: "Shape the plan", desc: "Lay ideas out on the flow board, split the plan into pages and sections, and set phases on the timeline." },
                            { step: "3", title: "Get it done", desc: "Turn the plan into tasks, put dates on the calendar and log each day. Ask Sasha or your own AI what to do next." },
                        ].map((item, idx) => (
                            <div key={idx} className="relative group">
                                <div className="p-7 md:p-10 bg-white/[0.02] border border-white/[0.04] rounded-3xl hover:border-primary/20 transition-all relative z-10 h-full flex flex-col">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-5 md:mb-6 text-base md:text-lg font-bold">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold mb-4">{item.title}</h3>
                                    <p className="text-white/45 leading-relaxed text-sm md:text-base">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <PricingSection signedIn={Boolean(isSignedIn)} />

            {/* H2 — FAQ Section (Schema-backed) */}
            <section id="faq" className="py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10 md:mb-14">
                        <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3">Questions</h2>
                        <p className="text-white/40 text-sm">Short answers to what people ask most.</p>
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
                        <div className="w-7 h-7 bg-transparent rounded-lg flex items-center justify-center overflow-hidden">
                            <img src="/stratabin-icon.svg" alt="Stratabin" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></span>
                    </div>
                    <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
                        <Link to="/features" className="text-white/40 hover:text-primary transition-colors">Features</Link>
                        {topicPaths.map(path => <Link key={path} to={path} className="text-white/40 hover:text-primary transition-colors">{publicPages[path].label}</Link>)}
                        <a href="#pricing" className="text-white/40 hover:text-primary transition-colors">Pricing</a>
                    </nav>
                    <p className="text-[11px] text-white/10">&copy; {new Date().getFullYear()} Stratabin. All rights reserved.</p>
                </div>
            </footer>

            {/* How it Works Full-Screen Overlay — Rich, visual, detailed */}
            {showHowTo && (
                <div className="fixed inset-0 z-[100] bg-[#060606] overflow-y-auto animate-in fade-in duration-400">
                    <button
                        onClick={() => setShowHowTo(false)}
                        className="fixed top-6 right-6 md:top-8 md:right-8 z-[110] w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-black transition-all group active:scale-95"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                    </button>

                    <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-28 space-y-32">

                        {/* ── SECTION 1: Why Stratabin ── */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                                    <Lightbulb size={20} />
                                </div>
                                <span className="text-primary font-semibold text-sm">Why it exists</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
                                Your plan is probably<br />
                                <span className="text-white/35">spread across too many apps.</span>
                            </h2>
                            <p className="text-white/40 text-base md:text-lg max-w-2xl leading-relaxed mb-14">
                                A doc for notes, a whiteboard for ideas, a list for tasks, and an AI chat that has never seen any of them. Stratabin puts all of it in one project, and lets your AI read the whole thing when you ask for help.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { icon: Compass, title: 'See the whole idea', desc: 'Put notes on one board, connect them, and move them around until the plan makes sense.' },
                                    { icon: Target, title: 'Turn it into work', desc: 'Make tasks, phases and calendar dates from the same project. Nothing to copy across.' },
                                    { icon: Rocket, title: 'AI that knows the project', desc: 'Pick what your AI should see, ask your question, and save the useful answer back in the project.' },
                                ].map(({ icon: Icon, title, desc }) => (
                                    <div key={title} className="p-7 rounded-3xl border border-white/[0.05] bg-white/[0.02] hover:border-white/10 transition-all group">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                                            <Icon size={22} className="text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">{title}</h3>
                                        <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── SECTION 2: Animated Visual Flow ── */}
                        <section>
                            <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">From first note to finished task</h2>
                                <p className="text-white/45 text-sm md:text-base max-w-xl mx-auto">Each step feeds the next. What you write and plan is also what your AI reads when you ask it for help.</p>
                            </div>

                            {/* Visual loop diagram */}
                            <div className="relative">
                                {/* Desktop: horizontal loop */}
                                <div className="hidden md:flex items-start justify-between gap-2 relative">
                                    {/* Connecting line */}
                                    <div className="absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
                                    {[
                                        { icon: Lightbulb, label: 'Ideas', desc: 'Get it all out first. Structure can wait.' },
                                        { icon: FileText, label: 'Writing', desc: 'Turn rough notes into a plan you can read back.' },
                                        { icon: Network, label: 'Flow board', desc: 'See how the pieces connect.' },
                                        { icon: Bot, label: 'Your AI', desc: 'Ask for help with the whole project attached.' },
                                        { icon: CheckSquare, label: 'Tasks and dates', desc: 'Tasks, calendar and timeline for the actual work.' },
                                    ].map(({ icon: Icon, label, desc }, i) => (
                                        <div key={label} className="flex-1 flex flex-col items-center text-center relative">
                                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 z-10 relative shadow-lg border" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                                                <Icon size={30} className="text-primary" />
                                            </div>
                                            {i < 4 && (
                                                <div className="absolute top-10 -right-3 z-20">
                                                    <ArrowRight size={16} className="text-primary/50" />
                                                </div>
                                            )}
                                            <div className="font-black text-sm mb-1">{label}</div>
                                            <div className="text-white/35 text-xs leading-relaxed px-2">{desc}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mobile: vertical flow */}
                                <div className="md:hidden flex flex-col items-center gap-0">
                                    {[
                                        { icon: Lightbulb, label: 'Ideas', desc: 'Get it all out first. Structure can wait.' },
                                        { icon: FileText, label: 'Writing', desc: 'Turn rough notes into a plan.' },
                                        { icon: Network, label: 'Flow board', desc: 'See how the pieces connect.' },
                                        { icon: Bot, label: 'Your AI', desc: 'Ask for help with the project attached.' },
                                        { icon: CheckSquare, label: 'Tasks and dates', desc: 'Calendar and timeline for the real work.' },
                                    ].map(({ icon: Icon, label, desc }, i, arr) => (
                                        <div key={label} className="flex flex-col items-center w-full">
                                            <div className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl border border-white/[0.04] bg-white/[0.02]">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                                                    <Icon size={22} className="text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-black text-sm">{label}</div>
                                                    <div className="text-white/35 text-xs mt-0.5">{desc}</div>
                                                </div>
                                            </div>
                                            {i < arr.length - 1 && (
                                                <div className="w-px h-6 bg-white/10 my-1" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ── SECTION 3: Mock Project Example ── */}
                        <section>
                            <div className="text-center mb-12">
                                <p className="text-primary font-semibold text-sm mb-4">Example</p>
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">What a project looks like</h2>
                                <p className="text-white/45 text-sm md:text-base max-w-xl mx-auto">A small "launch a mobile app" project, inside Stratabin.</p>
                            </div>

                            <div className="rounded-3xl border border-white/[0.06] overflow-hidden bg-[#0d0d0d] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
                                {/* Mock window bar */}
                                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.05] bg-[#111]">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                    <span className="ml-3 text-[11px] text-white/25 font-medium">Launch mobile app · Stratabin</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
                                    {/* Mock Canvas */}
                                    <div className="p-5 md:p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Network size={14} className="text-primary" />
                                            <span className="text-xs font-black text-white/50 uppercase tracking-widest">Project Notes</span>
                                        </div>
                                        <div className="relative h-48 rounded-xl bg-[#0a0a0a] border border-white/[0.04] overflow-hidden p-3">
                                            <p className="text-sm text-white/60">Project brief</p>
                                            <p className="mt-3 text-xs text-white/40">Capture your goals, plans, and next steps in one writing space.</p>
                                        </div>
                                    </div>

                                    {/* Mock Writing */}
                                    <div className="p-5 md:p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <PenTool size={14} className="text-purple-400" />
                                            <span className="text-xs font-black text-white/50 uppercase tracking-widest">Writing</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-base font-black text-white/80">Launch Mobile App</div>
                                            <div className="w-8 h-0.5 bg-primary/40 rounded-full" />
                                            <div className="text-[11px] text-white/40 leading-relaxed">
                                                <span className="text-white/60 font-bold">Goal:</span> Reach 1,000 downloads in first 30 days.<br /><br />
                                                <span className="text-white/60 font-bold">Phase 1: Research</span><br />
                                                Validate problem with 20 interviews. Define ICP clearly before building anything...<br /><br />
                                                <span className="text-white/60 font-bold">Phase 2: MVP</span><br />
                                                Core loop only: onboard → key action → result. Ship in 6 weeks...
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock your AI */}
                                    <div className="p-5 md:p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Bot size={14} className="text-emerald-400" />
                                            <span className="text-xs font-black text-white/50 uppercase tracking-widest">Saved AI response</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-white/50 leading-relaxed">
                                                Your project has 5 tasks and 3 deadlines. <span className="text-white/70">Two tasks still need dates.</span> Add deadlines to keep your plan on track.
                                            </div>
                                            <div className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15 text-[11px] text-white/50 leading-relaxed">
                                                <span className="text-emerald-400 font-bold">Your 3 top actions:</span><br />
                                                1. Connect UI Design → Dev Sprint<br />
                                                2. Define success metrics for App Store Launch<br />
                                                3. Set a go/no-go date for MVP
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── SECTION 4: Step-by-Step How It Works ── */}
                        <section>
                            <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">How to use it</h2>
                                <p className="text-white/45 text-sm">Four steps, all inside one project.</p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    {
                                        step: '01',
                                        icon: FileText,
                                        title: 'Start writing',
                                        desc: 'Open a new project and write. Headings, lists and highlights are there when you need them. Split the page to compare two options, or branch an idea into smaller ones right in the text.',
                                        tags: ['Split view', 'Branch mode', 'Writing Planner', 'Attachments'],
                                    },
                                    {
                                        step: '02',
                                        icon: Network,
                                        title: 'Plan it out',
                                        desc: 'Write a short brief, map the parts on the flow board, and add the first tasks. Ask your AI to poke holes in the plan.',
                                        tags: ['Project writing', 'Task lists', 'AI planning', 'Project folders'],
                                    },
                                    {
                                        step: '03',
                                        icon: Bot,
                                        title: 'Bring in your own AI',
                                        desc: 'Pick what to include, copy the project capsule, and paste it into ChatGPT, Claude or Gemini. Save the useful part of the answer back in the project.',
                                        tags: ['Choose your provider', 'Preview context', 'Download a brief', 'Save responses'],
                                    },
                                    {
                                        step: '04',
                                        icon: CheckSquare,
                                        title: 'Do the work',
                                        desc: 'Every project has its own tasks, calendar and timeline. Log what you finished each day, and check what is still open before you plan tomorrow.',
                                        tags: ['Integrated tasks', 'Calendar events', 'Timeline milestones', 'Daily execution logs'],
                                    },
                                ].map(({ step, icon: Icon, title, desc, tags }) => (
                                    <div key={step} className="flex gap-5 md:gap-8 p-6 md:p-8 rounded-3xl border border-white/[0.05] bg-white/[0.015] hover:border-white/[0.08] transition-all group">
                                        <div className="shrink-0">
                                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                                                <Icon size={24} className="text-primary" />
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-semibold text-white/35">Step {step}</span>
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-bold mb-3 leading-tight">{title}</h3>
                                            <p className="text-white/40 text-sm md:text-base leading-relaxed mb-4">{desc}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {tags.map(tag => (
                                                    <span key={tag} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/35 font-medium">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── SECTION 5: Why It's Special ── */}
                        <section>
                            <div className="text-center mb-14">
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Why it's different</h2>
                                <p className="text-white/45 text-sm max-w-xl mx-auto">It doesn't try to replace your docs app or your whiteboard. It keeps one project's plan and work in the same place.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[
                                    {
                                        title: 'Your AI sees the project, not one message',
                                        desc: 'Choose what goes into the brief and use it in your own AI account. The answer comes from your provider, and Stratabin keeps the useful parts with the project.',
                                        icon: Bot,
                                        badge: 'AI Intelligence',
                                    },
                                    {
                                        title: 'Strategy and execution in the same place',
                                        desc: 'Most people use one app to write, another to map ideas and a third for tasks, then spend time keeping them in sync. Here the writing, board, tasks, calendar and timeline live in one project.',
                                        icon: Layers,
                                        badge: 'Unified Workspace',
                                    },
                                    {
                                        title: 'Made for messy early ideas',
                                        desc: 'Ideas start half-formed and change as you go. You can dump notes, move them around on the board and tidy up later, instead of needing a clean structure on day one.',
                                        icon: GitBranch,
                                        badge: 'Designed for Thinking',
                                    },
                                    {
                                        title: 'Built by a solo creator, for creators and students',
                                        desc: 'Stratabin is built by one developer who got tired of switching between six apps to plan a single project. It is small on purpose, and it changes based on what people who use it ask for.',
                                        icon: Star,
                                        badge: 'Built with purpose',
                                    },
                                ].map(({ title, desc, icon: Icon, badge }) => (
                                    <div key={title} className="p-7 md:p-8 rounded-3xl border border-white/[0.05] bg-white/[0.015] hover:border-white/10 transition-all group">
                                        <div className="w-10 h-10 mb-5 rounded-xl flex items-center justify-center bg-primary/10 text-primary" title={badge}>
                                            <Icon size={18} />
                                        </div>
                                        <h3 className="text-lg md:text-xl font-bold mb-3 leading-snug">{title}</h3>
                                        <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── CTA ── */}
                        <section className="text-center pb-10">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Start with one project.</h2>
                            <p className="text-white/45 text-sm mb-8">Free to start. No card needed. Works on phone and desktop.</p>
                            <button
                                onClick={() => { setShowHowTo(false); navigate('/auth'); }}
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all shadow-[0_8px_40px_rgba(249,115,22,0.3)] active:scale-95 text-base"
                            >
                                Get started free
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </section>

                    </div>
                </div>
            )}

        </div>
    );
}
