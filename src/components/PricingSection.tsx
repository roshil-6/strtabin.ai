import { ArrowRight, Check, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const freeFeatures = [
    '4 active projects',
    '4 timetables — one for each project',
    'Writing and brainstorming boards',
    'Tasks, calendars, and timelines',
    'Project capsules for your own AI',
];
const proFeatures = [
    'Unlimited active projects',
    'Unlimited timetables, including multiple per project',
    'Team workspaces',
    'Shared projects and task assignments',
    'Team chat and shared insights',
    'All Free planning tools and AI capsules',
];

export default function PricingSection({ signedIn }: { signedIn: boolean }) {
    return (
        <section id="pricing" aria-labelledby="pricing-title" className="relative px-4 py-16 md:px-6 md:py-24 scroll-mt-24">
            <div className="relative z-10 max-w-5xl mx-auto">
                <div className="max-w-2xl mb-10">
                    <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-4">Free & Pro</p>
                    <h2 id="pricing-title" className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">Space for your ideas.<br />Room for your team.</h2>
                    <p className="text-white/70 text-base leading-relaxed">Start with your personal projects. Pro adds more room to plan and a shared workspace to work together.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-5 items-stretch">
                    <article aria-labelledby="free-plan-title" className="flex flex-col rounded-2xl border border-white/15 bg-black p-6 md:p-8">
                        <h3 id="free-plan-title" className="text-xl font-semibold text-white">Free</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">For your everyday ideas and personal plans.</p>
                        <p className="mt-7 mb-1"><span className="text-4xl font-semibold text-white">₹0</span><span className="ml-2 text-sm text-white/65">/ month</span></p>
                        <p className="text-sm text-white/60">No credit card required</p>
                        <ul className="my-7 pt-6 border-t border-white/10 space-y-4">
                            {freeFeatures.map(feature => <li key={feature} className="flex gap-3 text-sm text-white leading-relaxed"><Check size={17} aria-hidden="true" className="text-primary shrink-0 mt-0.5" /><span>{feature}</span></li>)}
                        </ul>
                        <Link to={signedIn ? '/dashboard' : '/auth'} className="mt-auto min-h-12 px-5 py-3 rounded-xl border border-white/20 text-white text-sm font-semibold flex justify-center items-center gap-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary transition-colors">
                            {signedIn ? 'Open your workspace' : 'Get started free'}<ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </article>
                    <article aria-labelledby="pro-plan-title" className="flex flex-col rounded-2xl border border-primary/45 bg-[#0b080f] p-6 md:p-8">
                        <div className="flex items-center justify-between gap-3 flex-wrap"><h3 id="pro-plan-title" className="text-xl font-semibold text-white flex items-center gap-2"><Users size={20} aria-hidden="true" className="text-primary" />Pro</h3><span className="rounded-full border border-primary/25 px-3 py-1 text-xs text-primary">Coming soon</span></div>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">For bigger plans and working together.</p>
                        <p className="mt-7 mb-1"><span className="text-4xl font-semibold text-white">₹109</span><span className="ml-2 text-sm text-white/65">/ month</span></p>
                        <p className="text-sm text-white/60">Planned monthly price in INR</p>
                        <ul className="my-7 pt-6 border-t border-white/10 space-y-4">
                            {proFeatures.map(feature => <li key={feature} className="flex gap-3 text-sm text-white leading-relaxed"><Check size={17} aria-hidden="true" className="text-primary shrink-0 mt-0.5" /><span>{feature}</span></li>)}
                        </ul>
                        <div className="mt-auto rounded-xl bg-primary/[0.06] border border-primary/15 p-4 text-sm leading-relaxed text-white/75">Pro subscriptions aren’t open yet. You can start with Free today.</div>
                    </article>
                </div>
                <p className="mt-6 text-sm text-white/65 leading-relaxed max-w-3xl">These are the planned launch allowances; plan limits are not enforced yet. Your own AI provider’s subscription and usage limits apply separately.</p>
            </div>
        </section>
    );
}
