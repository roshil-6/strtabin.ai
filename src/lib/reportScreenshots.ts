import { REPORT_IMAGE_BYTES, REPORT_IMAGE_LIMIT } from './projectAiPackage.ts';

/** A screenshot picked for a report: a compressed copy to keep, and a sharper copy to read. */
export type ReportShot = { id: string; name: string; stored: string; read: string };
export const SHOT_FILE_LIMIT = 15 * 1024 * 1024;
export const MAX_SHOTS = REPORT_IMAGE_LIMIT;

function loadImage(file: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read this image.'));
        reader.onload = () => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('This file is not a readable image.'));
            image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    });
}

function encode(image: HTMLImageElement, maxWidth: number, maxHeight: number, quality: number): string {
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Images cannot be processed in this browser.');
    // Screenshots with transparency would turn black as JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
}

/** Kept screenshots sync inside the project (the cloud copy of a personal workspace is capped at 8 MB). */
export const SHOT_STORED_TARGET = 250_000;
export const SHOT_WORKSPACE_BUDGET = 3_000_000;
/** The sharper copy sent for reading must fit the server's per-image limit. */
const SHOT_READ_LIMIT = 1_400_000;

/** Copy to keep with the report, shrunk until it is small; empty when it cannot be kept (text can still be extracted). */
export function compressForStorage(image: HTMLImageElement): string {
    for (const [width, quality] of [[1200, 0.72], [1000, 0.64], [900, 0.58], [800, 0.52], [700, 0.48], [600, 0.45]] as const) {
        const url = encode(image, width, width * 8, quality);
        if (url.length <= SHOT_STORED_TARGET) return url;
    }
    // Very long screenshots: accept a larger copy that stays readable, up to the per-image limit.
    for (const [width, quality] of [[900, 0.5], [700, 0.42], [520, 0.38]] as const) {
        const url = encode(image, width, width * 12, quality);
        if (url.length <= REPORT_IMAGE_BYTES) return url;
    }
    return '';
}

function compressForReading(image: HTMLImageElement): string {
    for (const [width, quality] of [[2000, 0.88], [1600, 0.82], [1300, 0.76], [1000, 0.7]] as const) {
        const url = encode(image, width, width * 6, quality);
        if (url.length * 0.98 <= SHOT_READ_LIMIT) return url;
    }
    return encode(image, 900, 5400, 0.62);
}

export async function prepareShot(file: File): Promise<ReportShot> {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error(`${file.name}: choose a PNG, JPEG or WebP screenshot.`);
    if (file.size > SHOT_FILE_LIMIT) throw new Error(`${file.name}: choose a screenshot under 15 MB.`);
    const image = await loadImage(file);
    return { id: crypto.randomUUID(), name: file.name, stored: compressForStorage(image), read: compressForReading(image) };
}

/** Characters used by report screenshots across the workspace, optionally ignoring one report being replaced. */
export function reportImageBytes(canvases: Record<string, { externalAiReports?: Array<{ id: string; images?: string[] }> }>, ignoreReportId?: string | null): number {
    let total = 0;
    for (const canvas of Object.values(canvases)) for (const report of canvas.externalAiReports || []) if (report.id !== ignoreReportId) for (const image of report.images || []) total += image.length;
    return total;
}

/** Base64 payload for the server, which forwards it to the model. */
export const shotPayload = (shot: ReportShot) => ({ mimeType: 'image/jpeg', data: shot.read.slice(shot.read.indexOf(',') + 1) });

/** Turns OCR lines into readable Markdown-ish text: bullets, paragraphs and fewer stray breaks. */
export function tidyOcrText(text: string): string {
    // OCR often reads bullet dots as +, «, » or *, so any of those before a space starts a list item.
    const lines = text.replace(/\r/g, '').split('\n').map(line => line.replace(/\s+$/g, '').replace(/^\s*[•●▪◦·∙‣+«»*–]\s+|^\s*[•●▪◦·]/, '- '));
    const out: string[] = [];
    for (const line of lines) {
        const previous = out[out.length - 1];
        const startsBlock = /^\s*(-|\d+[.)]|#)\s/.test(line);
        // OCR leaves blank lines between list items; keep a list together.
        if (startsBlock && /^\s*-\s/.test(line) && previous === '' && /^\s*-\s/.test(out[out.length - 2] || '')) out.pop();
        // Join a wrapped line onto the previous one when it clearly continues a sentence.
        if (line.trim() && previous && previous.trim() && !startsBlock && !/[.:;!?)]$/.test(previous.trim()) && /^[a-z(]/.test(line.trim())) out[out.length - 1] = `${previous} ${line.trim()}`;
        else out.push(line.trim() ? line : '');
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Reads text on this device with Tesseract (no AI, no credits). Its code and English data load on first use. */
export async function extractTextOnDevice(shots: ReportShot[], onProgress?: (value: number) => void): Promise<string> {
    const { createWorker } = await import('tesseract.js');
    let current = 0;
    const worker = await createWorker('eng', 1, { logger: message => { if (message.status === 'recognizing text' && onProgress) onProgress((current + message.progress) / shots.length); } });
    try {
        const parts: string[] = [];
        for (const [index, shot] of shots.entries()) {
            current = index;
            const { data } = await worker.recognize(shot.read);
            parts.push(tidyOcrText(data.text));
        }
        onProgress?.(1);
        return parts.filter(Boolean).join('\n\n');
    } finally { await worker.terminate(); }
}

