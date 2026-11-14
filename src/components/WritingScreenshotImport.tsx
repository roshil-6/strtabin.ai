import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Images, Loader2, ScanText, Sparkles, X } from 'lucide-react';
import { API_BASE_URL } from '../constants';
import { MAX_SHOTS, prepareShot, shotPayload, extractTextOnDevice, type ReportShot } from '../lib/reportScreenshots';

type AiStatus = { pro: boolean; configured: boolean; remaining?: number; limit: number };

/** Writing toolbar dialog: turn screenshots of an AI chat into text on this page, or attach them as images. */
export default function WritingScreenshotImport({ insertText, addImages, close }: { insertText: (text: string) => void; addImages: (images: string[]) => void; close: () => void }) {
    const { userId, getToken } = useAuth();
    const [shots, setShots] = useState<ReportShot[]>([]);
    const [busy, setBusy] = useState<null | 'loading' | 'ai' | 'ocr'>(null);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [status, setStatus] = useState<AiStatus | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);

    useEffect(() => { heading.current?.focus(); }, []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); close(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [busy, close]);
    useEffect(() => {
        if (!userId) return;
        let live = true;
        getToken().then(token => fetch(`${API_BASE_URL}/api/assistant/status`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }))
            .then(response => response.ok ? response.json() : null)
            .then(data => { if (live && data) setStatus({ pro: data.pro === true, configured: data.configured === true, remaining: typeof data.remaining?.chat === 'number' ? data.remaining.chat : undefined, limit: Number(data.limits?.chat) || 10 }); })
            .catch(() => { /* The AI option stays disabled; extracting without AI still works. */ });
        return () => { live = false; };
    }, [userId, getToken]);

    const addShots = async (files: FileList | File[]) => {
        const list = Array.from(files);
        if (!list.length) return;
        const room = MAX_SHOTS - shots.length;
        if (room <= 0) { setMessage(`Up to ${MAX_SHOTS} screenshots at a time. Remove one to add another.`); return; }
        setBusy('loading'); setMessage('');
        const added: ReportShot[] = []; const problems: string[] = [];
        for (const file of list.slice(0, room)) { try { added.push(await prepareShot(file)); } catch (error) { problems.push(error instanceof Error ? error.message : `${file.name}: could not be added.`); } }
        if (list.length > room) problems.push(`Only the first ${room} screenshot${room === 1 ? '' : 's'} were added.`);
        setShots(previous => [...previous, ...added].slice(0, MAX_SHOTS));
        setBusy(null);
        if (problems.length) setMessage(problems.join(' '));
    };
    const moveShot = (index: number) => setShots(previous => { const next = previous.slice(); [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; });

    const canUseAi = Boolean(userId) && shots.length > 0 && !busy && Boolean(status) && status!.configured && status!.remaining !== 0;
    const extractWithAi = async () => {
        if (!canUseAi) return;
        setBusy('ai'); setMessage('');
        try {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/assistant/report/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000), body: JSON.stringify({ images: shots.map(shotPayload) }) });
            const data = await response.json().catch(() => ({}));
            const remaining = typeof data.remaining === 'number' ? data.remaining : response.status === 429 ? 0 : undefined;
            if (remaining !== undefined) setStatus(previous => previous ? { ...previous, remaining } : previous);
            if (!response.ok || typeof data.content !== 'string' || !data.content.trim()) { setMessage(typeof data.error === 'string' ? data.error : 'The screenshots could not be read. Try again, or extract without AI.'); return; }
            const title = typeof data.title === 'string' && data.title.trim() ? `## ${data.title.trim()}\n\n` : '';
            setResult(title + data.content.trim());
            setMessage(`Extracted with Stratabin AI. Review it, then add it to the page.${remaining !== undefined ? ` ${remaining} Sasha ${remaining === 1 ? 'request' : 'requests'} left today.` : ''}`);
        } catch { setMessage('Could not reach Stratabin. Check your connection, or extract without AI.'); }
        finally { setBusy(null); }
    };
    const extractWithoutAi = async () => {
        if (!shots.length || busy) return;
        setBusy('ocr'); setProgress(0); setMessage('');
        try {
            const text = await extractTextOnDevice(shots, setProgress);
            if (!text.trim()) { setMessage('No text was found in these screenshots. Try clearer screenshots, or add them as images.'); return; }
            setResult(text);
            setMessage('Text read on this device. Check headings, lists and tables, then add it to the page.');
        } catch { setMessage('Text could not be read on this device. Check your connection (the reader downloads once), or add the screenshots as images.'); }
        finally { setBusy(null); }
    };
    const keepAsImages = () => {
        const images = shots.map(shot => shot.stored || shot.read);
        addImages(images);
        close();
    };

    const help = !userId ? 'Sign in to extract with Stratabin AI. Extract without AI is free.'
        : !status ? 'Checking your Sasha allowance…'
        : !status.configured ? 'Stratabin AI is not available on the server yet. Extract without AI is free.'
        : !status.pro && status.remaining === 0 ? <>You have used your free Sasha credits. <Link to="/billing">See Pro</Link> · Extract without AI is free.</>
        : !status.pro ? <>Free trial: Stratabin AI uses 1 Sasha credit{status.remaining !== undefined ? ` · ${status.remaining} of ${status.limit} left` : ''}. <Link to="/billing">See Pro</Link> · Extract without AI is free.</>
        : status.remaining === 0 ? 'Your daily Sasha allowance is used. Extract without AI is still free.'
        : `Stratabin AI uses 1 Sasha request${status.remaining !== undefined ? ` · ${status.remaining} of ${status.limit} left today` : ''}. The first extraction without AI downloads a reader (about 5 MB).`;

    // Rendered on the page body: the floating section editor is transformed, which would trap a fixed overlay inside it.
    return createPortal(<div className="writing-shot-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) close(); }}>
        <section className="writing-shot-dialog" role="dialog" aria-modal="true" aria-labelledby="writing-shot-title">
            <header>
                <h2 id="writing-shot-title" ref={heading} tabIndex={-1}><ScanText size={18} />{result === null ? 'Text from screenshots' : 'Review the extracted text'}</h2>
                <button type="button" aria-label="Close" title="Close (Esc)" disabled={!!busy} onClick={close}><X size={18} /></button>
            </header>
            {result === null ? <>
                <p>Upload screenshots of a Claude, ChatGPT or Gemini chat in reading order. Extract the writing into this page, or keep the screenshots as images.</p>
                <button type="button" className="writing-shot-drop" disabled={busy === 'loading' || shots.length >= MAX_SHOTS} onClick={() => input.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addShots(event.dataTransfer.files); }}>
                    {busy === 'loading' ? <Loader2 size={22} className="writing-shot-spin" /> : <Images size={22} />}
                    <strong>{shots.length ? 'Add more screenshots' : 'Choose screenshots'}</strong>
                    <small>or drop them here · PNG, JPEG or WebP · up to {MAX_SHOTS}</small>
                </button>
                <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={event => { const files = event.target.files; if (files) void addShots(files); event.target.value = ''; }} />
                {shots.length > 0 && <>
                    <ol className="writing-shot-list" aria-label="Screenshots in order">{shots.map((shot, index) => <li key={shot.id}>
                        <img src={shot.stored || shot.read} alt={`Screenshot ${index + 1}`} />
                        <span className="writing-shot-index">{index + 1}</span>
                        <span className="writing-shot-tools">{index > 0 && <button type="button" aria-label={`Move screenshot ${index + 1} earlier`} onClick={() => moveShot(index)}><ChevronLeft size={14} /></button>}<button type="button" aria-label={`Remove screenshot ${index + 1}`} onClick={() => setShots(previous => previous.filter(item => item.id !== shot.id))}><X size={14} /></button></span>
                    </li>)}</ol>
                    <div className="writing-shot-actions">
                        <button type="button" className="is-primary" disabled={!canUseAi} aria-busy={busy === 'ai'} onClick={() => void extractWithAi()}>{busy === 'ai' ? <Loader2 size={18} className="writing-shot-spin" /> : <Sparkles size={18} />}<span><strong>{busy === 'ai' ? 'Reading screenshots…' : 'Extract with Stratabin AI'}</strong><small>Keeps headings, lists and tables · 1 Sasha request</small></span></button>
                        <button type="button" disabled={!!busy} aria-busy={busy === 'ocr'} onClick={() => void extractWithoutAi()}>{busy === 'ocr' ? <Loader2 size={18} className="writing-shot-spin" /> : <ScanText size={18} />}<span><strong>{busy === 'ocr' ? `Reading text… ${Math.round(progress * 100)}%` : 'Extract without AI'}</strong><small>Free · runs on this device · plain text</small></span></button>
                        <button type="button" disabled={!!busy || shots.some(shot => !shot.stored)} title={shots.some(shot => !shot.stored) ? 'A screenshot is too large to keep as an image' : undefined} onClick={keepAsImages}><Images size={18} /><span><strong>Add as images</strong><small>Attach the screenshots to this page</small></span></button>
                    </div>
                    <p className="writing-shot-help">{help}</p>
                </>}
            </> : <>
                <label htmlFor="writing-shot-result">Edit anything before adding it.</label>
                <textarea id="writing-shot-result" value={result} rows={14} onChange={event => setResult(event.target.value)} />
                <div className="writing-shot-footer">
                    <button type="button" onClick={() => { setResult(null); setMessage(''); }}>Back</button>
                    <button type="button" className="is-primary" disabled={!result.trim()} onClick={() => { insertText(result.trim()); close(); }}>Add to page</button>
                </div>
            </>}
            {message && <p className="writing-shot-message" role="status">{message}</p>}
        </section>
    </div>, document.body);
}
