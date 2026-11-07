import { publicFaqs, publicPages, featureAvailabilityNotice, topicPaths } from '../content/publicContent';
import { guideIntro, guideLoop, guideGroups, guidePlaybooks } from '../content/featureGuide';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, FileText, Network, CheckSquare, Bot, Users, LayoutGrid, Cloud, MapPin, Lightbulb, type LucideIcon } from 'lucide-react';
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';
import './FeaturesPage.css';

const GROUP_ICONS: Record<string, LucideIcon> = { projects: LayoutGrid, writing: FileText, visual: Network, planning: CheckSquare, ai: Bot, team: Users, access: Cloud };

export default function FeaturesPage() {
    // Deep links such as /features#calendar open at that tool once the page has rendered.
    useEffect(() => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!id) return;
        // Wait for fonts and layout to settle, or the browser's own scroll restoration can undo the jump.
        const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 150);
        return () => window.clearTimeout(timer);
    }, []);
    const toolCount = guideGroups.reduce((sum, group) => sum + group.tools.length, 0);

    return (
        <div className="min-h-[100dvh] theme-page font-sans selection:bg-white/20 relative overflow-x-clip">
            <HexagonBackground />

            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-panel)_88%,transparent)] backdrop-blur-xl backdrop-saturate-150">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center overflow-hidden">
                            <img src="/stratabin-icon.svg" alt="Stratabin" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></span>
                    </Link>
                    <nav className="flex items-center gap-1 md:gap-3">
                        <ThemeToggle />
                        <Link to="/" className="hidden sm:inline-flex text-xs md:text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5">Home</Link>
                        <Link to="/#pricing" className="hidden sm:inline-flex text-xs md:text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5">Pricing</Link>
                        <Link to="/dashboard" className="text-xs md:text-sm font-bold px-3.5 py-2 rounded-xl bg-primary text-black hover:opacity-90 transition-opacity">Open app</Link>
                    </nav>
                </div>
            </header>

            <main className="features-guide pt-28 md:pt-36 pb-20 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-primary text-sm font-bold mb-10 transition-colors">
                        <ArrowLeft size={16} /> Back to Home
                    </Link>

                    <p className="fg-eyebrow">Features guide · {toolCount} tools explained</p>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4 text-[var(--text)]">{publicPages['/features'].heading}</h1>
                    <p className="text-lg text-[var(--text-muted)] mb-10 leading-relaxed max-w-2xl">
                        What Stratabin is, how every tool works step by step, and real examples of planning and executing with your team and with AI.
                    </p>

                    <section className="fg-intro pro-surface-card" aria-labelledby="what-is-stratabin">
                        <h2 id="what-is-stratabin">{guideIntro.heading}</h2>
                        {guideIntro.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                    </section>

                    <section className="fg-loop" aria-labelledby="fg-loop-heading">
                        <h2 id="fg-loop-heading">From idea to done: how the tools fit together</h2>
                        <ol>
                            {guideLoop.map((step, index) => <li key={step.title}><span className="fg-loop-num">{index + 1}</span><strong>{step.title}</strong><p>{step.body}</p></li>)}
                        </ol>
                    </section>

                    <nav aria-label="Feature groups" className="fg-jump">
                        {guideGroups.map(group => { const Icon = GROUP_ICONS[group.id] || LayoutGrid; return <a key={group.id} href={`#${group.id}`}><Icon size={15} />{group.title.split(':')[0]}</a>; })}
                        <a href="#playbooks"><Lightbulb size={15} />Examples</a>
                    </nav>

                    <div className="space-y-20">
                        {guideGroups.map(group => {
                            const Icon = GROUP_ICONS[group.id] || LayoutGrid;
                            return <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="fg-group">
                                <h2 id={`${group.id}-heading`}><span className="fg-group-icon"><Icon size={20} /></span>{group.title}</h2>
                                <p className="fg-group-intro">{group.intro}</p>
                                <div className="fg-tools">
                                    {group.tools.map(tool => <article key={tool.id} id={tool.id} className={`fg-tool pro-surface-card${tool.badge === 'New' ? ' is-new' : ''}`}>
                                        <header>
                                            <h3>{tool.title}</h3>
                                            {tool.badge && <span className={`fg-badge ${tool.badge === 'Pro' ? 'is-pro' : ''}`}>{tool.badge}</span>}
                                        </header>
                                        <p className="fg-what">{tool.what}</p>
                                        <h4>How it works</h4>
                                        <ol className="fg-how">{tool.how.map(step => <li key={step}>{step}</li>)}</ol>
                                        <div className="fg-example"><strong>Example</strong><p>{tool.example}</p></div>
                                        <p className="fg-where"><MapPin size={13} aria-hidden="true" /><span>Find it: {tool.where}</span></p>
                                    </article>)}
                                </div>
                            </section>;
                        })}
                    </div>

                    <section id="playbooks" className="fg-group mt-20" aria-labelledby="playbooks-heading">
                        <h2 id="playbooks-heading"><span className="fg-group-icon"><Lightbulb size={20} /></span>Putting it together</h2>
                        <p className="fg-group-intro">Three real ways people combine the tools to plan and finish work.</p>
                        <div className="fg-playbooks">
                            {guidePlaybooks.map(playbook => <article key={playbook.title} className="pro-surface-card">
                                <h3>{playbook.title}</h3>
                                <ol>{playbook.steps.map(step => <li key={step}>{step}</li>)}</ol>
                            </article>)}
                        </div>
                    </section>

                    <aside aria-label="Feature availability" className="mt-16 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-5 py-4 text-sm leading-relaxed text-[var(--text-muted)]">
                        <strong className="block mb-1 font-medium text-[var(--text)]">Feature availability</strong>
                        {featureAvailabilityNotice} Pro tools use daily Sasha allowances. Voice, dictation and reminders depend on your browser’s microphone and notification support.
                    </aside>

                    <nav className="mt-16 grid gap-4 md:grid-cols-3" aria-label="Stratabin use cases">
                        {topicPaths.map(path => <Link key={path} to={path} className="pro-surface-card p-5 group">
                            <strong className="block text-[var(--text)] mb-1">{publicPages[path].label}</strong>
                            <span className="block text-sm text-[var(--text-muted)] leading-relaxed mb-3">{publicPages[path].heading}</span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">Learn more <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                        </Link>)}
                    </nav>

                    <section className="mt-16 space-y-4" aria-labelledby="features-questions">
                        <h2 id="features-questions" className="text-2xl font-semibold text-[var(--text)]">Questions about Stratabin</h2>
                        {publicFaqs.map(faq => <details key={faq.q} className="pro-surface-card p-5">
                            <summary className="cursor-pointer font-medium text-[var(--text)]">{faq.q}</summary>
                            <p className="mt-3 leading-relaxed text-[var(--text-muted)]">{faq.a}</p>
                        </details>)}
                    </section>

                    <div className="mt-16 text-center">
                        <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all">
                            Start planning free <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
