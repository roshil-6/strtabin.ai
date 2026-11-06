import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, PlugZap, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../constants';

/** Public connector URL; set VITE_MCP_URL when the MCP server is not at <API>/mcp. */
const MCP_URL = (import.meta.env.VITE_MCP_URL as string | undefined)?.trim() || `${API_BASE_URL.replace(/\/$/, '')}/mcp`;

const APPS = [
    {
        name: 'Claude', logo: '/brands/claude.jpg',
        steps: ['In Claude, open Settings → Connectors.', 'Choose “Add custom connector”, name it Stratabin and paste the URL above. Leave the advanced OAuth fields empty.', 'Select Connect, sign in to Stratabin and allow access.', 'In a chat, turn on Stratabin from the tools menu if it is not already on.'],
        note: 'On Team and Enterprise plans an owner adds the connector first; members then connect their own account.',
    },
    {
        name: 'ChatGPT', logo: '/brands/chatgpt.jpg',
        steps: ['In ChatGPT, open Settings → Apps & Connectors → Advanced and turn on Developer mode.', 'Create a connector, name it Stratabin, paste the URL above and choose OAuth.', 'Sign in to Stratabin and allow access.', 'In a chat, add Stratabin from the tools menu.'],
        note: 'Custom connectors depend on your ChatGPT plan, and workspace admins may need to allow them. ChatGPT asks you to confirm before Stratabin saves anything.',
    },
    {
        name: 'Gemini', logo: '/brands/gemini.png',
        steps: ['In the Gemini web app, open Settings → Connected apps (or Apps).', 'Add a custom app with the URL above.', 'Sign in to Stratabin and allow access.'],
        note: 'Custom MCP apps in Gemini are rolling out gradually and may not be available on your account yet. Gemini Enterprise admins can add Stratabin for their organisation.',
    },
];

export default function ConnectAIPage() {
    const [copied, setCopied] = useState(false);
    useEffect(() => { document.title = 'Connect your AI to Stratabin'; }, []);
    const copy = async () => {
        try { await navigator.clipboard.writeText(MCP_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the URL stays selectable */ }
    };
    return <main className="min-h-[100dvh] theme-page px-4 md:px-6 py-10 md:py-16">
        <div className="max-w-3xl mx-auto">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-primary mb-8"><ArrowLeft size={15} /> Projects</Link>
            <div className="flex items-center gap-3 text-primary mb-3"><PlugZap size={22} /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Connector</span></div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text)] mb-3">Save AI reports straight to your projects</h1>
            <p className="text-[var(--text-muted)] leading-relaxed mb-8">Add Stratabin to Claude, ChatGPT or Gemini once. At the end of a chat, say <em>“save this report to Stratabin”</em>. Your AI asks which project, then the report appears in that project’s saved AI reports, with no copying and pasting.</p>

            <section className="pro-surface-card p-5 md:p-6 mb-8" aria-labelledby="connector-url">
                <h2 id="connector-url" className="text-sm font-semibold text-[var(--text)] mb-3">Connector URL</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input readOnly value={MCP_URL} aria-label="Stratabin connector URL" onFocus={event => event.currentTarget.select()} className="flex-1 min-w-0 rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2.5 font-mono text-sm text-[var(--text)]" />
                    <button type="button" onClick={() => void copy()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy URL'}</button>
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">You sign in with your Stratabin account when you connect. No API key or password is shared with the AI app.</p>
            </section>

            <div className="space-y-5 mb-8">
                {APPS.map(app => <section key={app.name} className="pro-surface-card p-5 md:p-6" aria-labelledby={`setup-${app.name}`}>
                    <h2 id={`setup-${app.name}`} className="flex items-center gap-3 text-lg font-semibold text-[var(--text)] mb-3"><img src={app.logo} alt="" className="w-7 h-7 rounded-lg object-cover" />{app.name}</h2>
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">{app.steps.map(step => <li key={step}>{step}</li>)}</ol>
                    <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">{app.note}</p>
                </section>)}
            </div>

            <section className="pro-surface-card p-5 md:p-6" aria-labelledby="connector-access">
                <h2 id="connector-access" className="flex items-center gap-2 text-lg font-semibold text-[var(--text)] mb-3"><ShieldCheck size={18} className="text-primary" />What the connector can do</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                    <li>List and search the names of your personal and team projects.</li>
                    <li>Save a new report to a project you choose (up to 40,000 characters, 30 reports per project).</li>
                    <li>It cannot read your writing, tasks or boards, and cannot edit or delete anything.</li>
                </ul>
                <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">Reports for personal projects are added the next time Stratabin is open in your browser. To stop access, disconnect Stratabin in your AI app’s connector settings.</p>
            </section>
        </div>
    </main>;
}
