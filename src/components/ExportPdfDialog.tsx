import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileDown, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore, { type CanvasData } from '../store/useStore';
import { useProjectLoader } from '../hooks/useProjectLoader';
import { EXPORT_SECTIONS, buildProjectExportHtml, printHtml, type ExportSection, type ExportProject } from '../lib/projectPdfExport';
import { writingPlainText } from '../lib/writingBranches';
import './ExportPdfDialog.css';

const PREF_KEY = 'stratabin-export-sections';
const readPref = (): ExportSection[] => {
    try {
        const saved = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
        if (Array.isArray(saved)) return saved.filter((id): id is ExportSection => EXPORT_SECTIONS.some(section => section.id === id));
    } catch { /* fall back to everything */ }
    return EXPORT_SECTIONS.map(section => section.id);
};
const reportHtml = (markdown: string) => renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>);
const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;

/** Export a project to PDF. Works from inside the project or from the project list (it loads the project first). */
export default function ExportPdfDialog({ canvasId, close }: { canvasId: string; close: () => void }) {
    const { loading, error, retry } = useProjectLoader(canvasId);
    const canvas = useStore(state => state.canvases[canvasId]);
    const dialog = useRef<HTMLDivElement>(null);
    const closeRef = useRef(close);
    useEffect(() => { closeRef.current = close; }, [close]);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        dialog.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); previous?.focus?.(); };
    }, []);
    const name = canvas?.name || canvas?.title || 'this project';

    return <div className="export-pdf-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
        <div ref={dialog} tabIndex={-1} className="export-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="export-pdf-title">
            <header>
                <div><FileDown size={18} /><h2 id="export-pdf-title">Export {name} to PDF</h2></div>
                <button aria-label="Close" onClick={close}><X size={18} /></button>
            </header>
            {error ? <div className="export-pdf-error" role="alert">{error} <button type="button" onClick={retry}>Try again</button></div>
                : loading || !canvas ? <p className="export-pdf-loading" role="status">Loading project…</p>
                    : <ExportOptions canvas={canvas} close={close} />}
        </div>
    </div>;
}

function ExportOptions({ canvas, close }: { canvas: CanvasData; close: () => void }) {
    const [selected, setSelected] = useState<ExportSection[]>(readPref);
    const [busy, setBusy] = useState(false);
    const pages = (canvas.writingPages || []).filter(page => !page.quickNote);
    const words = [canvas.writingContent || '', ...pages.map(page => page.content)].map(writingPlainText).join(' ').split(/\s+/).filter(Boolean).length;
    let phases = 0;
    try { phases = JSON.parse(canvas.timelineContent || '{}')?.phases?.length || 0; } catch { /* legacy text timeline */ }
    const reports = (canvas.externalAiReports || []).filter(report => !report.archived).length;
    const summary: Record<ExportSection, string> = {
        writing: `${plural(pages.length + 1, 'page')} · ${plural(words, 'word')}`,
        progress: `${plural((canvas.todos || []).length, 'task')} · ${plural((canvas.goals || []).length, 'goal')} · ${plural(phases, 'phase')}`,
        flow: `${plural((canvas.nodes || []).length, 'idea')} · ${plural((canvas.edges || []).length, 'connection')}`,
        ai: plural(reports, 'saved report'),
    };
    const toggle = (id: ExportSection) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    const allOn = selected.length === EXPORT_SECTIONS.length;

    const exportPdf = async () => {
        if (!selected.length || busy) return;
        setBusy(true);
        try { localStorage.setItem(PREF_KEY, JSON.stringify(selected)); } catch { /* preference is optional */ }
        try {
            const name = canvas.name || canvas.title || 'Project';
            const html = buildProjectExportHtml(canvas as unknown as ExportProject, selected, reportHtml);
            const fileTitle = `${name} - ${EXPORT_SECTIONS.filter(section => selected.includes(section.id)).map(section => section.label).join(', ')}`;
            close();
            await printHtml(html, fileTitle);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not export this project.');
            setBusy(false);
        }
    };

    return <>
        <p className="export-pdf-intro">Choose what goes into the PDF. Each section starts on a new page.</p>
        <div className="export-pdf-all"><button type="button" onClick={() => setSelected(allOn ? [] : EXPORT_SECTIONS.map(section => section.id))}>{allOn ? 'Clear all' : 'Select all'}</button><span>{selected.length} of {EXPORT_SECTIONS.length} selected</span></div>
        <fieldset>
            <legend className="sr-only">Sections to include</legend>
            {EXPORT_SECTIONS.map(section => {
                const on = selected.includes(section.id);
                return <label key={section.id} className="export-pdf-option" data-checked={on}>
                    <input type="checkbox" checked={on} onChange={() => toggle(section.id)} />
                    <span className="export-pdf-check" aria-hidden="true">{on && <Check size={13} strokeWidth={3} />}</span>
                    <span className="export-pdf-text"><strong>{section.label}</strong><small>{section.description}</small><em>{summary[section.id]}</em></span>
                </label>;
            })}
        </fieldset>
        <footer>
            <small>Your browser’s print window opens. Pick <b>Save as PDF</b> as the destination.</small>
            <div><button type="button" onClick={close}>Cancel</button><button type="button" className="primary" disabled={!selected.length || busy} onClick={exportPdf}><FileDown size={15} />Export PDF</button></div>
        </footer>
    </>;
}
