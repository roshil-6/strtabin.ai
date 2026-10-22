import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Lightbulb, FileText, ListChecks, ArrowUpRight, X } from 'lucide-react';
export default function ProjectAI({ id }: { id: string }) {
    const [open, setOpen] = useState(false);
    const element = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const close = (event: PointerEvent) => { if (element.current && !element.current.contains(event.target as globalThis.Node)) setOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
    }, []);
    const navigate = useNavigate();
    const location = useLocation();
    const actions = [
        { label: 'Brainstorm new possibilities', icon: Lightbulb, prompt: 'Review my project board and writing. Help me brainstorm new ideas and connections.' },
        { label: 'Summarize this project', icon: FileText, prompt: 'Summarize my project, including my board, writing, tasks, and progress. Highlight gaps.' },
        { label: 'Turn ideas into a plan', icon: ListChecks, prompt: 'Use my board and writing to suggest an actionable project plan with tasks and priorities.' },
    ];
    return <div ref={element} className="project-ai-launcher">
        {open && <section className="project-ai-menu"><h3>Your project, with a thinking partner.</h3><p>Brainstorm, find clarity, and decide what comes next using this project’s context.</p>{actions.map(({ label, icon: Icon, prompt }) => <button key={label} onClick={() => { setOpen(false); navigate(`/ai/${id}?prompt=${encodeURIComponent(prompt)}`, { state: location.state }); }}><Icon size={16} />{label}</button>)}<button onClick={() => { setOpen(false); navigate(`/ai/${id}`, { state: location.state }); }}><ArrowUpRight size={16} />Use my AI</button></section>}
        <button className="project-ai-button" aria-label={open ? 'Close project AI actions' : 'Open project AI actions'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={16} /> : <Sparkles size={16} />}<span>Project AI</span></button>
    </div>;
}
