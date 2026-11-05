import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { publicFeatures, publicPages, topicPaths } from '../content/publicContent';
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';

/** Indexable landing page for a search topic (docs workspace, team workspace, AI workspace). */
export default function TopicPage() {
    const { pathname } = useLocation();
    const path = pathname.replace(/\/$/, '');
    const page = publicPages[path];
    if (!page) return null;
    const features = publicFeatures.filter(feature => page.categories?.includes(feature.category));
    const related = topicPaths.filter(other => other !== path);

    return (
        <div className="min-h-[100dvh] theme-page font-sans relative overflow-x-hidden">
            <HexagonBackground />
            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-panel)_88%,transparent)] backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <img src="/stratabin-icon.svg" alt="" className="w-9 h-9 md:w-10 md:h-10 object-contain" />
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-[var(--text)]">Stratabin<span className="text-primary">.</span></span>
                    </Link>
                    <nav className="flex items-center gap-1 md:gap-3" aria-label="Site">
                        <ThemeToggle />
                        <Link to="/features" className="text-xs md:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] px-3 py-2 rounded-xl">Features</Link>
                        <Link to="/auth" className="text-xs md:text-sm font-bold text-primary px-3 py-2 rounded-xl">Sign in</Link>
                    </nav>
                </div>
            </header>

            <main className="pt-28 md:pt-36 pb-20 px-4 md:px-6">
                <article className="max-w-4xl mx-auto">
                    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[var(--text-muted)]">
                        <Link to="/" className="hover:text-primary">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">{page.label}</span>
                    </nav>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-5 text-[var(--text)]">{page.heading}</h1>
                    <p className="text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mb-4">{page.description}</p>
                    {page.intro && <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-10">{page.intro}</p>}
                    <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90">
                        Start free <ArrowRight size={16} />
                    </Link>

                    {page.sections && <div className="mt-16 grid gap-5 md:grid-cols-3">
                        {page.sections.map(section => <section key={section.heading} className="pro-surface-card p-6">
                            <h2 className="text-lg font-semibold text-[var(--text)] mb-2 tracking-tight">{section.heading}</h2>
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{section.body}</p>
                        </section>)}
                    </div>}

                    {features.length > 0 && <section className="mt-16" aria-labelledby="topic-features">
                        <h2 id="topic-features" className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)] mb-6">What you can do</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {features.map(feature => <div key={feature.title} className="pro-surface-card p-5">
                                <h3 className="flex items-center gap-2 font-semibold text-[var(--text)] mb-1.5"><Sparkles size={16} className="text-primary shrink-0" />{feature.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{feature.desc}</p>
                            </div>)}
                        </div>
                        <Link to="/features" className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-primary">See every feature <ArrowRight size={15} /></Link>
                    </section>}

                    <nav className="mt-16 pt-8 border-t border-[var(--border)]" aria-label="More about Stratabin">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">More about Stratabin</h2>
                        <ul className="flex flex-wrap gap-3">
                            {related.map(other => <li key={other}><Link to={other} className="inline-block px-4 py-2 rounded-xl border border-[var(--border-strong)] text-sm text-[var(--text-secondary)] hover:text-primary hover:border-primary">{publicPages[other].label}</Link></li>)}
                            <li><Link to="/features" className="inline-block px-4 py-2 rounded-xl border border-[var(--border-strong)] text-sm text-[var(--text-secondary)] hover:text-primary hover:border-primary">All features</Link></li>
                        </ul>
                    </nav>
                    <Link to="/" className="inline-flex items-center gap-2 mt-10 text-sm font-bold text-[var(--text-muted)] hover:text-primary"><ArrowLeft size={15} /> Back to home</Link>
                </article>
            </main>
        </div>
    );
}
