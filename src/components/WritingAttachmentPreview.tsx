import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function WritingAttachmentPreview({ doc, close }: { doc: { name: string; url: string }; close: () => void }) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [page, setPage] = useState(1);
    const [text, setText] = useState('');
    const [html, setHtml] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const canvas = useRef<HTMLCanvasElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const ext = doc.name.split('.').pop()?.toLowerCase() || '';
    const image = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
    useEffect(() => {
        heading.current?.focus();
        const controller = new AbortController();
        let disposed = false;
        let pdfTask: ReturnType<typeof getDocument> | undefined;
        async function load() {
            try {
                if (!doc.url.startsWith('data:') && !doc.url.startsWith('blob:')) throw new Error('This attachment link cannot be previewed. Attach the original file again.');
                if (image) { setLoading(false); return; }
                const response = await fetch(doc.url, { signal: controller.signal });
                if (!response.ok) throw new Error('Could not read this attachment.');
                if (ext === 'pdf') {
                    pdfTask = getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
                    const document = await pdfTask.promise;
                    if (!disposed) setPdf(document);
                } else if (ext === 'docx') {
                    const mammoth = await import('mammoth');
                    const result = await mammoth.convertToHtml({ arrayBuffer: await response.arrayBuffer() });
                    if (!disposed) setHtml(DOMPurify.sanitize(result.value, { FORBID_TAGS: ['img', 'style', 'iframe', 'object'], FORBID_ATTR: ['style'] }));
                } else if (['txt', 'md', 'csv', 'json', 'log'].includes(ext)) {
                    const value = await response.text();
                    if (!disposed) setText(value);
                } else throw new Error('Preview supports PDF, DOCX, images, TXT, Markdown, CSV, and JSON. Convert older DOC files to DOCX or PDF before attaching them.');
            } catch (err) { if (!disposed) setError(err instanceof Error ? err.message : 'Could not preview this file.'); }
            finally { if (!disposed) setLoading(false); }
        }
        void load();
        return () => { disposed = true; controller.abort(); void pdfTask?.destroy(); };
    }, [doc.url, ext, image]);
    useEffect(() => {
        if (!pdf) return;
        let disposed = false;
        let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
        void (async () => {
            try {
                const sheet = await pdf.getPage(page);
                if (disposed || !canvas.current) return;
                const viewport = sheet.getViewport({ scale: 1 });
                const scale = Math.min(2, 1800 / Math.max(viewport.width, viewport.height));
                const view = sheet.getViewport({ scale });
                canvas.current.width = view.width; canvas.current.height = view.height;
                renderTask = sheet.render({ canvas: canvas.current, viewport: view });
                await renderTask.promise;
                const content = await sheet.getTextContent();
                if (!disposed) setText(content.items.map(item => 'str' in item ? item.str : '').join(' '));
            } catch { if (!disposed) setError('This PDF page could not be displayed. The file may be damaged or password protected.'); }
        })();
        return () => { disposed = true; renderTask?.cancel(); };
    }, [pdf, page]);
    return <section className="writing-attachment-preview" aria-label="Attachment preview">
        <header><h3 ref={heading} tabIndex={-1}>{doc.name}</h3><button onClick={close} aria-label="Close attachment preview"><X size={20} /></button></header>
        {loading && <p role="status">Opening attachment…</p>}
        {error && <p role="alert">{error}</p>}
        {!error && <div className="writing-attachment-body">
            {image && <img src={doc.url} alt={doc.name} onError={() => setError('This image could not be displayed. Try attaching the original again.')} />}
            {pdf && <><nav aria-label="PDF pages"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {pdf.numPages}</span><button disabled={page >= pdf.numPages} onClick={() => setPage(p => p + 1)}>Next</button></nav><canvas ref={canvas} aria-label={`Page ${page} of ${doc.name}`} /><details><summary>Readable page text</summary><p>{text || 'This page has no selectable text.'}</p></details></>}
            {html && <div className="attachment-document" dangerouslySetInnerHTML={{ __html: html }} />}
            {!pdf && !image && ext !== 'docx' && <pre>{text}</pre>}
        </div>}
    </section>;
}
