import { publicFeatures } from '../content/publicContent';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';

export default function FeaturesPage() {
    const features = publicFeatures;

    return (
        <div className="min-h-[100dvh] theme-page font-sans selection:bg-white/20 relative overflow-x-hidden">
            <HexagonBackground />

            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-panel)_88%,transparent)] backdrop-blur-xl backdrop-saturate-150">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Link to="/" className="flex items-center gap-2.5">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-transparent rounded-xl flex items-center justify-center overflow-hidden shadow-lg ">
                                <img src="/stratabin-icon.svg" alt="Stratabin" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xl md:text-2xl font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></span>
                        </Link>
                    </div>
                    <nav className="flex items-center gap-2 md:gap-4">
                        <ThemeToggle />
                        <Link to="/" className="text-xs md:text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5">
                            Home
                        </Link>
                        <Link to="/#pricing" className="text-xs md:text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5">
                            Pricing
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="pt-28 md:pt-36 pb-20 px-4 md:px-6">
                <div className="max-w-4xl mx-auto">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-primary text-sm font-bold mb-10 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>

                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4 text-[var(--text)]">
                        Writing, planning, teamwork and AI — connected
                    </h1>
                    <p className="text-lg text-[var(--text-muted)] mb-16 leading-relaxed max-w-2xl">
                        Stratabin is the AI workspace and strategy planner that helps you unscatter your thoughts and turn them into execution plans. Here&apos;s everything you get in one unified strategy workspace.
                    </p>

                    <section className="space-y-12">
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)]">
                            Everything you need to plan and execute
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed">
                            Keep your planning and daily work together. Write long-form strategies, branch ideas into visual flowcharts, merge projects, and get AI-powered insights — all in one place.
                        </p>

                        <div className="grid gap-5 md:gap-6">
                            {features.map((feat, i) => (
                                <article key={i} className="pro-surface-card p-6 md:p-8">
                                    <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] flex items-center justify-center mb-4">
                                        <Sparkles size={22} className="text-primary" />
                                    </div>
                                    <h3 className="text-lg md:text-xl font-semibold text-[var(--text)] mb-2 tracking-tight">{feat.title}</h3>
                                    <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">{feat.desc}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="mt-20 pro-step-card p-8 md:p-12">
                        <h2 className="text-2xl font-bold tracking-tight mb-6 text-[var(--text)]">How Stratabin works: idea to execution</h2>
                        <ol className="space-y-6 text-[var(--text-muted)]">
                            <li><strong className="text-[var(--text-secondary)] font-semibold">1. Capture & Write</strong> — Start with raw ideas in the writing editor. Use split view to compare angles, or branch into visual flowcharts.</li>
                            <li><strong className="text-[var(--text-secondary)] font-semibold">2. Plan & Organize</strong> — Organize your project notes, create folder workspaces, and let your AI help refine your plan.</li>
                            <li><strong className="text-[var(--text-secondary)] font-semibold">3. Execute & Track</strong> — Convert strategies into tasks, set calendar deadlines, build timelines, and use AI reports to monitor progress and identify gaps.</li>
                        </ol>
                    </section>

                    <div className="mt-16 text-center">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all"
                        >
                            Get Started Free
                            <ArrowLeft size={18} className="rotate-180" />
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
