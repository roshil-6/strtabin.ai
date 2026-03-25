import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Check, Zap, ArrowRight, Mail, Bot, X, Compass, Target, Rocket, ChevronDown, Layout, PenTool, Calendar, GitBranch, FolderOpen, Layers, Sparkles, Users, User, Lock, Menu } from 'lucide-react';

import { fetchPaymentLink, GUEST_TRIAL_KEY } from '../constants';
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';
import toast from 'react-hot-toast';

export default function LandingPage() {
    const navigate = useNavigate();
    const { isSignedIn, isLoaded: authLoaded, getToken } = useAuth();
    const [showHowTo, setShowHowTo] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [formEmail, setFormEmail] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const mobileNavRef = useRef<HTMLDivElement>(null);

    const isLoaded = authLoaded;

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
                setMobileNavOpen(false);
            }
        };
        if (mobileNavOpen) document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [mobileNavOpen]);

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

    const handleGuestAccess = () => {
        if (!localStorage.getItem(GUEST_TRIAL_KEY)) {
            localStorage.setItem(GUEST_TRIAL_KEY, Date.now().toString());
        }
        navigate('/dashboard', { replace: true });
    };

    const handleLandingGetStarted = (e: FormEvent) => {
        e.preventDefault();
        const email = formEmail.trim();
        const username = formUsername.trim();
        const password = formPassword;
        if (!email && (!username || !password)) {
            toast.error('Enter your email for a free code, or username and password to sign in.');
            return;
        }
        try {
            sessionStorage.setItem(
                'stratabin-auth-prefill',
                JSON.stringify({ email: email || undefined, username: username || undefined, password: password || undefined }),
            );
        } catch {
            /* ignore */
        }
        navigate('/auth');
    };

    const scrollToDiscover = () => {
        document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handlePayment = async () => {
        setPaymentLoading(true);
        try {
            const token = await getToken?.();
            const url = await fetchPaymentLink(token ?? undefined);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Payment link error:', err);
            toast.error((err as Error)?.message || 'Could not open payment. Please try again.');
        } finally {
            setPaymentLoading(false);
        }
    };

    const faqs = [
        {
            q: "What is Stratabin and how does the AI strategy planning work?",
            a: "Stratabin is an AI workspace and strategy planner for ideas. Notes, flows, and STRAB AI help you unscatter your thoughts and turn them into execution plans. STRAB AI analyzes your canvas, writing, and project structure to provide context-aware insights and suggest next steps."
        },
        {
            q: "Is Stratabin free to use?",
            a: "Yes — Stratabin offers a free trial so you can explore every feature. After the trial, full lifetime access is available for a one-time payment of ₹64 (India) or $2 (International). No subscriptions, no hidden fees."
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
            a: "STRAB AI reads your entire project context — ideas on the canvas, writing, tasks, timelines — and provides strategic analysis, gap identification, progress reports, and actionable recommendations. It's a strategy co-pilot, not just a chatbot."
        },
    ];

    return (
        <div className={`min-h-screen theme-page font-sans selection:bg-white/20 relative ${showHowTo ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
            <HexagonBackground />

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-panel)_92%,transparent)] backdrop-blur-xl backdrop-saturate-150">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 shrink">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/10 shrink-0">
                            <img src="/favicon.png" alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter text-white truncate">Stratabin<span className="text-primary">.</span></span>
                    </div>
                    <nav className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
                        <ThemeToggle />
                        <div className="hidden lg:flex items-center gap-1">
                            <button type="button" onClick={() => setShowHowTo(true)} className="text-sm font-semibold text-white/40 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5">
                                How it works
                            </button>
                            <Link to="/features" className="text-sm font-semibold text-white/40 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5">
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
                                className="text-sm font-semibold text-white/40 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5"
                            >
                                Pricing
                            </Link>
                            <button type="button" onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-semibold text-white/40 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5">
                                FAQ
                            </button>
                        </div>
                        <div className="relative lg:hidden" ref={mobileNavRef}>
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen((o) => !o)}
                                className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
                                aria-expanded={mobileNavOpen}
                                aria-label="Menu"
                            >
                                <Menu size={20} />
                            </button>
                            {mobileNavOpen && (
                                <div className="absolute right-0 top-full mt-2 w-52 py-2 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--bg-panel)_96%,black)] shadow-xl backdrop-blur-xl z-50">
                                    <button type="button" onClick={() => { setMobileNavOpen(false); setShowHowTo(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">
                                        How it works
                                    </button>
                                    <Link to="/features" onClick={() => setMobileNavOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">
                                        Features
                                    </Link>
                                    <Link
                                        to="/#pricing"
                                        onClick={(e) => {
                                            setMobileNavOpen(false);
                                            if (window.location.pathname === '/') {
                                                e.preventDefault();
                                                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        className="block px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                                    >
                                        Pricing
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileNavOpen(false);
                                            document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                                    >
                                        FAQ
                                    </button>
                                    <Link
                                        to="/auth"
                                        onClick={() => setMobileNavOpen(false)}
                                        className="block px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 border-t border-white/10 mt-1 pt-2"
                                    >
                                        Sign in
                                    </Link>
                                    <button type="button" onClick={() => { setMobileNavOpen(false); handleGuestAccess(); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-primary hover:bg-white/10">
                                        Continue as guest
                                    </button>
                                </div>
                            )}
                        </div>
                        {isSignedIn ? (
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all text-xs sm:text-sm whitespace-nowrap"
                            >
                                Dashboard
                                <ArrowRight size={14} className="opacity-80" />
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleGuestAccess}
                                    className="hidden lg:inline-flex text-xs font-semibold text-white/45 hover:text-white px-2 py-2 rounded-xl hover:bg-white/5 whitespace-nowrap"
                                >
                                    Guest
                                </button>
                                <Link
                                    to="/auth"
                                    className="shrink-0 text-xs sm:text-sm font-semibold text-white/50 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 whitespace-nowrap"
                                >
                                    Sign in
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero — tagline + signup only; everything else below #discover */}
            <section id="hero-signup" className="pt-24 sm:pt-28 md:pt-36 pb-8 sm:pb-12 px-4 md:px-6 scroll-mt-20 min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center">
                <div className="max-w-lg mx-auto w-full text-center">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">Stratabin</p>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.12] mb-3">
                        Unscatter your ideas.
                    </h1>
                    <p className="text-sm sm:text-base text-[var(--text-muted)] mb-8 max-w-md mx-auto leading-relaxed">
                        One workspace for notes, flow canvases, and STRAB AI — plan and execute in one place.
                    </p>

                    {!isLoaded ? (
                        <div className="flex items-center justify-center gap-3 px-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl animate-pulse mx-auto w-full max-w-md">
                            <div className="w-5 h-5 border-2 border-white/10 border-t-white rounded-full animate-spin shrink-0" />
                            <span className="text-xs font-semibold text-white/45">Loading…</span>
                        </div>
                    ) : isSignedIn ? (
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-black font-bold rounded-2xl hover:bg-white transition-all text-sm shadow-lg"
                        >
                            <Zap size={18} fill="currentColor" />
                            Go to dashboard
                            <ArrowRight size={18} />
                        </button>
                    ) : (
                        <form
                            onSubmit={handleLandingGetStarted}
                            className="w-full max-w-md mx-auto text-left rounded-2xl border border-white/[0.08] bg-[color-mix(in_srgb,var(--bg-panel)_75%,transparent)] backdrop-blur-xl p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                        >
                            <p className="text-center text-xs text-white/45 mb-5 font-medium">
                                New here? We&apos;ll email you a code. Already have an account? Use username and password.
                            </p>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-1.5">Email</label>
                            <div className="relative mb-4">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                                <input
                                    type="email"
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30"
                                />
                            </div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-1.5">Username</label>
                            <div className="relative mb-4">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                    autoComplete="username"
                                    placeholder="For password sign-in"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30"
                                />
                            </div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-1.5">Password</label>
                            <div className="relative mb-5">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                                <input
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    autoComplete="current-password"
                                    placeholder="If you use password login"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!isLoaded}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-white transition-colors disabled:opacity-50 shadow-md"
                            >
                                <Zap size={17} fill="currentColor" />
                                Continue
                                <ArrowRight size={17} />
                            </button>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                                <button type="button" onClick={handleGuestAccess} className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors">
                                    Continue as guest — 24h trial
                                </button>
                                <span className="hidden sm:inline text-white/15">·</span>
                                <button type="button" onClick={scrollToDiscover} className="text-xs font-semibold text-primary hover:text-white transition-colors inline-flex items-center gap-1">
                                    Product tour & pricing
                                    <ChevronDown size={14} className="opacity-80" />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>

            {/* Video, features, pricing, FAQ — below the fold */}
            <div id="discover" className="scroll-mt-20">
                <section className="py-12 md:py-16 px-4 md:px-6 border-t border-white/[0.05]">
                    <div className="max-w-3xl mx-auto text-center mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">See Stratabin in action</h2>
                        <p className="text-sm text-white/40">Walkthrough, features, and pricing below.</p>
                    </div>
                    <div className="w-full max-w-3xl mx-auto">
                        <div className="relative pro-hero-video overflow-hidden rounded-2xl border border-white/10 aspect-video bg-black/40">
                            <video src="/strtabin%20ad%203.mp4" controls playsInline className="w-full h-full object-contain">
                                Your browser does not support the video tag.
                            </video>
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
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-[var(--text)]">Everything you need to plan and execute</h2>
                        <p className="text-[var(--text-muted)] text-sm md:text-base max-w-xl mx-auto leading-relaxed">A complete strategy workspace — writing, canvas, tasks, and AI in one calm surface.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        {[
                            { icon: PenTool, title: "Distraction-Free Writing", desc: "Long-form writing editor with split view, branch creation, and a collapsible planner for deep strategic thinking." },
                            { icon: Layout, title: "Interactive Flow Canvas", desc: "Drag-and-drop visual canvas to map ideas, connect strategies, and see the big picture at a glance." },
                            { icon: Bot, title: "STRAB AI Intelligence", desc: "Context-aware AI that analyzes your entire project — ideas, writing, tasks — and provides strategic insights and gap analysis." },
                            { icon: GitBranch, title: "Branch & Merge Ideas", desc: "Split one idea into multiple branches, or merge separate strategy canvases into a unified project overview." },
                            { icon: Calendar, title: "Calendar & Timeline", desc: "Built-in calendar with event reminders and a timeline planner tied directly to your strategy projects." },
                            { icon: FolderOpen, title: "Folder Workspaces", desc: "Organize projects into custom folders with dedicated workflow maps showing inter-project relationships." },
                            { icon: Users, title: "Team & Social Workspaces", desc: "Create team workspaces, invite members, share public projects, and build together. Streaks and progress scoring keep everyone accountable." },
                            { icon: Layers, title: "Project Merging", desc: "Combine multiple strategy canvases into one master view with tabbed sub-projects for complex initiatives." },
                            { icon: Sparkles, title: "Task Management", desc: "Integrated to-do lists for every project. Track progress alongside your strategy, not in a separate tool." },
                            { icon: Zap, title: "Works Everywhere", desc: "Progressive Web App that installs on phones, tablets, and desktops. Touch-optimized mobile interface with offline support." },
                        ].map((feat, i) => (
                            <div key={i} className="pro-surface-card group p-6 md:p-7">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] flex items-center justify-center mb-4">
                                    <feat.icon size={20} className="text-primary" />
                                </div>
                                <h3 className="text-sm md:text-base font-semibold text-[var(--text)] mb-2 tracking-tight">{feat.title}</h3>
                                <p className="text-[var(--text-muted)] text-xs md:text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* H2 — How It Works (Step-by-step) */}
            <section className="py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12 md:mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 text-[var(--text)]">How Stratabin works</h2>
                        <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">From raw idea to structured execution in three steps.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {[
                            { step: "01", title: "Capture & Write", desc: "Start with your raw ideas in the writing editor. Use split view to compare angles, or branch into visual flowcharts." },
                            { step: "02", title: "Map & Organize", desc: "Drag ideas onto the flow canvas and connect them. Merge related projects, create folder workspaces, and let AI organize the structure." },
                            { step: "03", title: "Execute & Track", desc: "Convert strategies into tasks, set calendar deadlines, build timelines, and use STRAB AI reports to monitor progress and identify gaps." },
                        ].map((item, idx) => (
                            <div key={idx} className="relative group">
                                <div className="absolute -top-6 -left-2 text-7xl md:text-8xl font-extrabold text-[color-mix(in_srgb,var(--text)_4%,transparent)] pointer-events-none select-none">{item.step}</div>
                                <div className="pro-step-card p-7 md:p-9 relative z-10 h-full flex flex-col">
                                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[var(--accent-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] flex items-center justify-center text-primary mb-6 text-sm font-bold tabular-nums">
                                        {item.step}
                                    </div>
                                    <h3 className="text-lg md:text-xl font-semibold mb-3 text-[var(--text)] tracking-tight">{item.title}</h3>
                                    <p className="text-[var(--text-muted)] leading-relaxed text-sm md:text-base">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* H2 — Pricing */}
            <section id="pricing" className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="text-center mb-10 md:mb-16">
                        <h2 className="text-2xl md:text-3xl font-black mb-3">Simple, One-Time Pricing</h2>
                        <p className="text-white/30 text-sm">Pay once. Use forever. No subscriptions, no surprises.</p>
                    </div>

                    <div className="pro-pricing-shell group relative p-7 md:p-14 overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent)] pointer-events-none" />
                        <div className="absolute top-5 right-5 px-3 py-1 bg-primary text-black text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                            Lifetime
                        </div>

                        <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center md:gap-12">
                            <div>
                                <h3 className="text-primary font-bold uppercase tracking-widest text-xs mb-4">Full Access — Lifetime</h3>
                                <div className="flex items-baseline gap-3 mb-2">
                                    <span className="text-5xl md:text-6xl font-black text-white">₹64</span>
                                    <div className="flex flex-col">
                                        <span className="text-white/70 font-bold text-sm">India</span>
                                        <span className="text-white/60 text-xs">One-time payment</span>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-3 mt-3">
                                    <span className="text-2xl md:text-3xl font-black text-white/60">$2</span>
                                    <div className="flex flex-col">
                                        <span className="text-white/70 font-bold text-sm">International</span>
                                        <span className="text-white/60 text-xs">USD, one-time</span>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:block w-px h-32 bg-white/[0.06] shrink-0" />
                            <div className="space-y-3 mt-6 md:mt-0 flex-1">
                                {[
                                    "Unlimited Strategy Canvases",
                                    "STRAB AI Intelligence — Full Access",
                                    "Team & Social Workspaces",
                                    "Folder Workflow Maps",
                                    "Writing, Tasks & Calendar",
                                    "Install on Phone (PWA)",
                                    "All Future Updates Included",
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs md:text-sm font-medium text-white/75">
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-black shrink-0">
                                            <Check size={11} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => handlePayment()}
                            disabled={paymentLoading}
                            className="w-full py-4 md:py-5 bg-primary text-black rounded-2xl font-black uppercase text-xs md:text-sm tracking-widest hover:bg-white transition-all shadow-[0_10px_40px_rgba(218,119,86,0.15)] flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <Zap size={18} fill="currentColor" />
                            {paymentLoading ? 'Opening payment...' : 'Get Full Access — ₹64 / $2'}
                        </button>
                        <p className="text-center text-white/55 text-[11px] md:text-xs mt-4">
                            Secured by Razorpay · No recurring charges
                        </p>
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
                            <div key={i} className="pro-faq-item overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 md:py-5 text-left"
                                >
                                    <span className="text-sm md:text-base font-semibold text-[var(--text-secondary)]">{faq.q}</span>
                                    <ChevronDown size={18} className={`text-[var(--text-dim)] shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 animate-in slide-in-from-top-1 fade-in duration-200 border-t border-[var(--border)]">
                                        <p className="text-xs md:text-sm text-[var(--text-muted)] leading-relaxed pt-4">{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            </div>

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
                                    { step: "01", title: "Capture & Flow", description: "Map out your initial thoughts using our fluid canvas. Add ideas, link them, and visualize the big picture without friction.", icon: Zap },
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

                   {paymentLoading && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-primary font-black uppercase text-xs tracking-widest animate-pulse">Opening payment...</p>
                </div>
            )}
        </div>
    );
}
