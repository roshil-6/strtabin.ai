import { publicFeatures, publicFaqs, publicPages, featureAvailabilityNotice, featureCategories, topicPaths, type FeatureCategory } from '../content/publicContent';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Network, CheckSquare, Bot, Users, LayoutGrid } from 'lucide-react';

const CATEGORY_ICONS: Record<FeatureCategory, typeof FileText> = { 'Docs & writing': FileText, 'Visual thinking': Network, 'Planning & progress': CheckSquare, 'AI assistance': Bot, 'Teamwork': Users, 'Workspace & access': LayoutGrid };
const slug = (category: string) => category.toLowerCase().replace(/[^a-z]+/g, '-');
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';

export default function FeaturesPage() {

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
                        {publicPages['/features'].heading}
                    </h1>
                    <p className="text-lg text-[var(--text-muted)] mb-6 leading-relaxed max-w-2xl">
                        {publicPages['/features'].description}
                    </p>

                    <aside aria-label="Feature availability" className="mb-12 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-5 py-4 text-sm leading-relaxed text-[var(--text-muted)]">
                        <strong className="block mb-1 font-medium text-[var(--text)]">Feature availability</strong>
                        {featureAvailabilityNotice}
                    </aside>

                    <nav aria-label="Feature categories" className="mb-12 flex flex-wrap gap-2">
                        {featureCategories.map(category => <a key={category} href={`#${slug(category)}`} className="px-3.5 py-2 rounded-xl border border-[var(--border-strong)] text-sm text-[var(--text-secondary)] hover:text-primary hover:border-primary transition-colors">{category}</a>)}
                    </nav>

                    <p className="text-[var(--text-muted)] leading-relaxed mb-12">
                        {publicFeatures.length} features across docs, visual thinking, planning, AI and teamwork — everything Stratabin can do today, in one workspace.
                    </p>

                    <div className="space-y-16">
                        {featureCategories.map(category => {
                            const Icon = CATEGORY_ICONS[category];
                            return <section key={category} id={slug(category)} aria-labelledby={`${slug(category)}-heading`} className="scroll-mt-28">
                                <h2 id={`${slug(category)}-heading`} className="flex items-center gap-3 text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)] mb-6">
                                    <span className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] flex items-center justify-center"><Icon size={20} className="text-primary" /></span>
                                    {category}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {publicFeatures.filter(feature => feature.category === category).map(feature => (
                                        <article key={feature.title} className="pro-surface-card p-5 md:p-6">
                                            <h3 className="text-base md:text-lg font-semibold text-[var(--text)] mb-2 tracking-tight">{feature.title}</h3>
                                            <p className="text-[var(--text-muted)] text-sm leading-relaxed">{feature.desc}</p>
                                        </article>
                                    ))}
                                </div>
                            </section>;
                        })}
                    </div>

                    <nav className="mt-16 grid gap-4 md:grid-cols-3" aria-label="Stratabin use cases">
                        {topicPaths.map(path => <Link key={path} to={path} className="pro-surface-card p-5 group">
                            <strong className="block text-[var(--text)] mb-1">{publicPages[path].label}</strong>
                            <span className="block text-sm text-[var(--text-muted)] leading-relaxed mb-3">{publicPages[path].heading}</span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">Learn more <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                        </Link>)}
                    </nav>

                    <section className="mt-20 pro-step-card p-8 md:p-12">
                        <h2 className="text-2xl font-bold tracking-tight mb-6 text-[var(--text)]">How Stratabin works: idea to execution</h2>
                        <ol className="space-y-6 text-[var(--text-muted)]">
                            <li><strong className="text-[var(--text-secondary)] font-semibold">1. Capture & Write</strong> — Start with raw ideas in the writing editor. Use split view to compare angles, or branch into visual flowcharts.</li>
                            <li><strong className="text-[var(--text-secondary)] font-semibold">2. Plan & Organize</strong> — Organize your project notes, create folder workspaces, and let your AI help refine your plan.</li>
                            <li><strong className="text-[var(--text-secondary)] font-semibold">3. Execute & Track</strong> — Convert strategies into tasks, set calendar deadlines, build timelines, and review reports to monitor progress and identify gaps.</li>
                        </ol>
                    </section>

                    <section className="mt-16 space-y-4" aria-labelledby="features-questions">
                        <h2 id="features-questions" className="text-2xl font-semibold text-[var(--text)]">Questions about Stratabin</h2>
                        {publicFaqs.map(faq => <details key={faq.q} className="pro-surface-card p-5">
                            <summary className="cursor-pointer font-medium text-[var(--text)]">{faq.q}</summary>
                            <p className="mt-3 leading-relaxed text-[var(--text-muted)]">{faq.a}</p>
                        </details>)}
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
