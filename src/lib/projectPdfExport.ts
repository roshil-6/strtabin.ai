import { markdownToHtml, HIGHLIGHT_COLORS } from './richText.ts';
import { readWritingBlocks, type BranchNode } from './writingBranches.ts';
import { ROOT_PAGE, type WritingPage } from './writingPages.ts';

export type ExportSection = 'writing' | 'progress' | 'flow' | 'ai';
export const EXPORT_SECTIONS: { id: ExportSection; label: string; description: string }[] = [
    { id: 'writing', label: 'Writing', description: 'Main page, every page, part, section and note, plus quick notes' },
    { id: 'progress', label: 'Progress', description: 'Task completion, goals and timeline phases' },
    { id: 'flow', label: 'Flow', description: 'The idea map as a diagram, with every idea and connection listed' },
    { id: 'ai', label: 'AI analysis', description: 'Saved AI reports for this project' },
];

type FlowNode = { id: string; type?: string; position?: { x: number; y: number }; width?: number | null; height?: number | null; measured?: { width?: number; height?: number }; style?: { width?: unknown; height?: unknown }; data?: Record<string, unknown> };
type FlowEdge = { source: string; target: string; label?: unknown };
export type ExportProject = {
    name?: string; title?: string; writingContent?: string; writingPages?: WritingPage[]; timelineContent?: string;
    nodes?: FlowNode[]; edges?: FlowEdge[];
    todos?: Array<{ text: string; completed: boolean }>;
    goals?: Array<{ label: string; targetMetric?: string; targetValue?: number; currentValue?: number; unit?: string }>;
    externalAiReports?: Array<{ title: string; content: string; provider: string; createdAt: number; archived?: boolean }>;
};

const esc = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const str = (value: unknown) => typeof value === 'string' ? value : '';

function branchHtml(nodes: BranchNode[]) {
    return `<ul class="branch">${nodes.map((node, index) => `<li class="${index === 0 ? 'topic' : ''}" style="margin-left:${node.depth * 18}px">${esc(node.label)}</li>`).join('')}</ul>`;
}

/** One page's stored writing (Markdown, branch blocks and split columns) as print HTML. */
export function writingContentHtml(raw: string): string {
    const content = (raw || '').replace(/<<<SECTION_ID:[^>]+>>>/g, '');
    const start = content.indexOf('<<<SPLIT_SECTION_START>>>');
    const body = (text: string) => readWritingBlocks(text).map(block => 'text' in block ? (block.text.trim() ? markdownToHtml(block.text.replace(/^\n+|\n+$/g, '')) : '') : branchHtml(block.nodes)).join('');
    if (start === -1) return body(content);
    const main = content.slice(0, start);
    const split = content.slice(start);
    const part = (side: 'A' | 'B') => {
        const match = side === 'A' ? /<<<SPLIT_SECTION_START>>>([^]*?)<<<SPLIT_SECTION_SEP>>>/.exec(split) : /<<<SPLIT_SECTION_SEP>>>([^]*?)<<<SPLIT_SECTION_END>>>/.exec(split);
        const text = match?.[1] || '';
        const heading = new RegExp(`<<<HEADING_${side}:(.*?)>>>`).exec(text)?.[1] || `Column ${side}`;
        return `<div class="column"><h4>${esc(heading)}</h4>${body(text.replace(/<<<HEADING_[AB]:.*?>>>/g, ''))}</div>`;
    };
    return body(main) + `<div class="columns">${part('A')}${part('B')}</div>`;
}

function writingSection(project: ExportProject) {
    const pages = (project.writingPages || []).filter(page => !page.quickNote);
    const notes = (project.writingPages || []).filter(page => page.quickNote && (page.title.trim() || page.content.trim()));
    const out: string[] = [];
    const main = writingContentHtml(project.writingContent || '');
    if (main.trim()) out.push(`<article class="page">${main}</article>`);
    const seen = new Set<string>();
    const walk = (parentId: string, depth: number) => {
        for (const page of pages.filter(item => item.parentId === parentId)) {
            if (seen.has(page.id)) continue;
            seen.add(page.id);
            const level = Math.min(5, depth + 3);
            const kind = page.kind && page.kind !== 'page' ? `<span class="kind">${esc(page.kind === 'scene' ? 'Note' : page.kind)}</span>` : '';
            out.push(`<article class="page depth-${Math.min(depth, 3)}"><h${level}>${kind}${esc(page.title || 'Untitled')}</h${level}>${writingContentHtml(page.content) || '<p class="empty">No writing yet.</p>'}</article>`);
            walk(page.id, depth + 1);
        }
    };
    walk(ROOT_PAGE, 0);
    // Pages whose parent was removed still belong in the export.
    pages.filter(page => !seen.has(page.id)).forEach(page => { seen.add(page.id); out.push(`<article class="page"><h3>${esc(page.title || 'Untitled')}</h3>${writingContentHtml(page.content)}</article>`); });
    if (notes.length) out.push(`<h3>Quick notes</h3><div class="quick-notes">${notes.map(note => `<div class="quick-note"><strong>${esc(note.title || 'Note')}</strong>${markdownToHtml(note.content)}</div>`).join('')}</div>`);
    return out.length ? out.join('') : '<p class="empty">No writing yet.</p>';
}

const bar = (ratio: number) => `<span class="bar"><span style="width:${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%"></span></span>`;

function progressSection(project: ExportProject) {
    const todos = project.todos || [];
    const done = todos.filter(todo => todo.completed).length;
    const goals = project.goals || [];
    let timeline: { phases: Array<{ name: string; timeframe: string; description: string; status: string }>; notes: string } = { phases: [], notes: '' };
    try { const parsed = JSON.parse(project.timelineContent || ''); if (parsed?.format === 'structured') timeline = { phases: parsed.phases || [], notes: parsed.notes || '' }; } catch { timeline.notes = project.timelineContent || ''; }
    const phasesDone = timeline.phases.filter(phase => phase.status === 'done').length;
    const out: string[] = [];
    out.push(`<div class="stats">
        <div><b>${todos.length ? Math.round(done / todos.length * 100) : 0}%</b><span>Tasks complete (${done}/${todos.length})</span>${bar(todos.length ? done / todos.length : 0)}</div>
        <div><b>${timeline.phases.length ? Math.round(phasesDone / timeline.phases.length * 100) : 0}%</b><span>Timeline phases done (${phasesDone}/${timeline.phases.length})</span>${bar(timeline.phases.length ? phasesDone / timeline.phases.length : 0)}</div>
        <div><b>${goals.length}</b><span>Goals tracked</span></div></div>`);
    if (goals.length) out.push(`<h3>Goals</h3><table><thead><tr><th>Goal</th><th>Progress</th><th></th></tr></thead><tbody>${goals.map(goal => {
        const has = typeof goal.targetValue === 'number' && goal.targetValue > 0;
        return `<tr><td>${esc(goal.label)}${goal.targetMetric ? `<small>${esc(goal.targetMetric)}</small>` : ''}</td><td>${has ? `${esc(goal.currentValue ?? 0)} / ${esc(goal.targetValue)} ${esc(goal.unit || '')}` : '—'}</td><td class="bar-cell">${has ? bar((goal.currentValue || 0) / goal.targetValue!) : ''}</td></tr>`;
    }).join('')}</tbody></table>`);
    if (timeline.phases.length) out.push(`<h3>Timeline</h3><table><thead><tr><th>#</th><th>Phase</th><th>When</th><th>Status</th></tr></thead><tbody>${timeline.phases.map((phase, index) => `<tr><td>${index + 1}</td><td><strong>${esc(phase.name || 'Untitled phase')}</strong>${phase.description ? `<small>${esc(phase.description)}</small>` : ''}</td><td>${esc(phase.timeframe || '—')}</td><td><span class="status ${esc(phase.status)}">${esc(phase.status === 'done' ? 'Done' : phase.status === 'active' ? 'In progress' : 'Planned')}</span></td></tr>`).join('')}</tbody></table>`);
    if (timeline.notes.trim()) out.push(`<h3>Timeline notes</h3>${markdownToHtml(timeline.notes)}`);
    if (todos.length) out.push(`<h3>Tasks</h3><ul class="tasks">${todos.map(todo => `<li class="${todo.completed ? 'done' : ''}"><span class="check">${todo.completed ? '✓' : ''}</span>${esc(todo.text)}</li>`).join('')}</ul>`);
    if (!goals.length && !timeline.phases.length && !todos.length && !timeline.notes.trim()) out.push('<p class="empty">No tasks, goals or timeline yet.</p>');
    return out.join('');
}

const size = (node: FlowNode, axis: 'width' | 'height', fallback: number) => {
    const fromStyle = Number.parseFloat(String(node.style?.[axis] ?? ''));
    return node.measured?.[axis] || node[axis] || (Number.isFinite(fromStyle) ? fromStyle : 0) || fallback;
};

function flowSection(project: ExportProject) {
    const nodes = (project.nodes || []).filter(node => node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y));
    const edges = project.edges || [];
    if (!nodes.length) return '<p class="empty">The flow board is empty.</p>';
    const label = (node: FlowNode) => str(node.data?.label) || str(node.data?.title) || (node.type === 'brainstormImage' ? 'Image' : 'Untitled idea');
    const boxes = nodes.map(node => ({ node, x: node.position!.x, y: node.position!.y, w: size(node, 'width', 200), h: size(node, 'height', 120) }));
    const minX = Math.min(...boxes.map(box => box.x)) - 40, minY = Math.min(...boxes.map(box => box.y)) - 40;
    const maxX = Math.max(...boxes.map(box => box.x + box.w)) + 40, maxY = Math.max(...boxes.map(box => box.y + box.h)) + 40;
    const byId = new Map(boxes.map(box => [box.node.id, box]));
    const lines = edges.map(edge => {
        const from = byId.get(edge.source), to = byId.get(edge.target);
        if (!from || !to) return '';
        const x1 = from.x + from.w / 2, y1 = from.y + from.h / 2, x2 = to.x + to.w / 2, y2 = to.y + to.h / 2;
        // Stop the arrow at the target box's edge.
        const dx = x2 - x1, dy = y2 - y1;
        const scale = Math.min(Math.abs((to.w / 2) / (dx || 1e-6)), Math.abs((to.h / 2) / (dy || 1e-6)), 1);
        const ex = x2 - dx * scale, ey = y2 - dy * scale;
        const text = str(edge.label) ? `<text x="${(x1 + ex) / 2}" y="${(y1 + ey) / 2 - 6}" class="edge-label">${esc(edge.label)}</text>` : '';
        return `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" marker-end="url(#arrow)" />${text}`;
    }).join('');
    const shapes = boxes.map(({ node, x, y, w, h }) => {
        const color = str(node.data?.color) || '#fde68a';
        const src = str(node.data?.src);
        const content = src.startsWith('data:image/') ? `<image href="${esc(src)}" x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" preserveAspectRatio="xMidYMid meet" />`
            : `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" class="node-text">${esc(label(node))}</div></foreignObject>`;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${esc(color)}" />${content}`;
    }).join('');
    const index = new Map(nodes.map((node, i) => [node.id, i + 1]));
    const width = maxX - minX, height = maxY - minY;
    return `<figure class="flow"><svg viewBox="${minX} ${minY} ${width} ${height}" style="aspect-ratio:${width}/${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flow diagram">
        <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6b7280"/></marker></defs>
        <g class="edges">${lines}</g><g class="nodes">${shapes}</g></svg></figure>
        <h3>Ideas</h3><ol class="ideas">${nodes.map(node => `<li>${esc(label(node))}</li>`).join('')}</ol>
        ${edges.length ? `<h3>Connections</h3><ul class="connections">${edges.filter(edge => index.has(edge.source) && index.has(edge.target)).map(edge => `<li><b>${index.get(edge.source)}</b> ${esc(label(nodes[index.get(edge.source)! - 1]))} → <b>${index.get(edge.target)}</b> ${esc(label(nodes[index.get(edge.target)! - 1]))}${str(edge.label) ? ` <em>(${esc(edge.label)})</em>` : ''}</li>`).join('')}</ul>` : ''}`;
}

const STYLES = `
@page{size:A4;margin:18mm 16mm}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:10.5pt/1.65 'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;color:#1f2328;background:#fff}
.cover{min-height:240mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always}
.cover .eyebrow{font-size:9pt;letter-spacing:.18em;text-transform:uppercase;color:#c2410c;font-weight:600}
.cover h1{font-size:30pt;line-height:1.15;margin:10px 0 14px;letter-spacing:-.02em}
.cover p{color:#57606a;margin:0}
.cover ol{margin:28px 0 0;padding-left:18px;color:#3d444d;font-size:11pt}
.cover ol li{margin:4px 0}
section.part{page-break-before:always}
section.part:first-of-type{page-break-before:auto}
h2.section-title{font-size:20pt;margin:0 0 4px;letter-spacing:-.01em}
.section-sub{color:#6e7781;font-size:9.5pt;margin:0 0 18px;padding-bottom:10px;border-bottom:2px solid #f97316}
h3{font-size:14pt;margin:22px 0 8px}h4{font-size:12pt;margin:18px 0 6px}h5{font-size:11pt;margin:14px 0 6px}
h1,h2,h3,h4,h5{page-break-after:avoid;break-after:avoid}
.page{margin-bottom:14px}.page.depth-1{padding-left:12px;border-left:2px solid #fed7aa}.page.depth-2,.page.depth-3{padding-left:22px;border-left:2px solid #ffedd5}
.page > div, .quick-note > div{min-height:1.65em}
.kind{display:inline-block;margin-right:8px;padding:1px 7px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:7.5pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;vertical-align:middle}
blockquote{margin:8px 0;padding:4px 0 4px 12px;border-left:3px solid #f97316;color:#57606a;font-style:italic;background:#fff7ed}
ul,ol{padding-left:22px;margin:6px 0}
mark{background:#fde68a;color:inherit;padding:0 2px;border-radius:2px}
${Object.entries(HIGHLIGHT_COLORS).map(([name, value]) => `mark[data-color=${name}]{background:${value.print}}`).join('')}
code{font-family:Consolas,ui-monospace,monospace;font-size:9pt;background:#f3f4f6;padding:1px 4px;border-radius:4px}
pre{font-family:Consolas,ui-monospace,monospace;font-size:9pt;background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;white-space:pre-wrap;page-break-inside:avoid}
a{color:#c2410c}
.branch{list-style:none;padding:8px 12px;border-left:2px solid #f97316;background:#fff7ed;border-radius:0 8px 8px 0}.branch li.topic{font-weight:700}
.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}.column{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px}.column h4{margin-top:4px;color:#c2410c;text-transform:uppercase;font-size:9.5pt;letter-spacing:.08em}
.quick-notes{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quick-note{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;page-break-inside:avoid;background:#fffbeb}
.empty{color:#8c959f;font-style:italic}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px}.stats>div{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}.stats b{display:block;font-size:18pt;line-height:1.2}.stats span{display:block;font-size:8.5pt;color:#6e7781;margin-bottom:6px}
.bar{display:block;height:6px;border-radius:99px;background:#f1f5f9;overflow:hidden;min-width:80px}.bar>span{display:block;height:100%;background:#f97316;border-radius:99px}
table{width:100%;border-collapse:collapse;font-size:9.5pt;margin:6px 0}th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6e7781;border-bottom:1px solid #d0d7de;padding:6px 8px}td{border-bottom:1px solid #eaeef2;padding:7px 8px;vertical-align:top}td small{display:block;color:#6e7781}td.bar-cell{width:30%;vertical-align:middle}tr{page-break-inside:avoid}
.status{padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#f1f5f9;color:#57606a;white-space:nowrap}.status.done{background:#dcfce7;color:#166534}.status.active{background:#ffedd5;color:#c2410c}
.tasks{list-style:none;padding:0}.tasks li{display:flex;gap:8px;align-items:baseline;padding:3px 0}.tasks .check{flex:0 0 13px;height:13px;border:1.5px solid #9ca3af;border-radius:3px;font-size:9pt;line-height:11px;text-align:center;color:#166534}.tasks li.done{color:#6e7781;text-decoration:line-through}.tasks li.done .check{border-color:#16a34a}
figure.flow{margin:0 0 10px;border:1px solid #e5e7eb;border-radius:10px;padding:10px;page-break-inside:avoid}figure.flow svg{display:block;width:100%;max-height:230mm;height:auto}
.edges line{stroke:#6b7280;stroke-width:2}.edge-label{font-size:12px;fill:#374151;text-anchor:middle}
.nodes rect{stroke:rgba(0,0,0,.18);stroke-width:1}.node-text{width:100%;height:100%;padding:10px;font:14px/1.35 'Segoe UI',system-ui,sans-serif;color:#111827;overflow:hidden;word-break:break-word;white-space:pre-wrap}
.ideas,.connections{columns:2;column-gap:24px;font-size:9.5pt}.ideas li,.connections li{break-inside:avoid;margin:2px 0}
.report{margin-bottom:22px}.report-meta{color:#6e7781;font-size:9pt;margin:-4px 0 10px}.report table{font-size:9pt}.report p{margin:0 0 8px}
`;

/** Full printable HTML for the chosen sections. `aiHtml` renders report Markdown (kept outside so this file has no React). */
export function buildProjectExportHtml(project: ExportProject, sections: ExportSection[], aiHtml: (markdown: string) => string, now = new Date()): string {
    const name = project.name || project.title || 'Untitled project';
    const chosen = EXPORT_SECTIONS.filter(section => sections.includes(section.id));
    const body = chosen.map(section => {
        let html = '';
        if (section.id === 'writing') html = writingSection(project);
        if (section.id === 'progress') html = progressSection(project);
        if (section.id === 'flow') html = flowSection(project);
        if (section.id === 'ai') {
            const reports = (project.externalAiReports || []).filter(report => !report.archived);
            html = reports.length ? reports.map(report => `<article class="report"><h3>${esc(report.title)}</h3><p class="report-meta">${esc(report.provider)} · ${esc(new Date(report.createdAt).toLocaleDateString())}</p>${aiHtml(report.content)}</article>`).join('') : '<p class="empty">No saved AI reports yet. Save one from the project’s AI page.</p>';
        }
        return `<section class="part"><h2 class="section-title">${esc(section.label)}</h2><p class="section-sub">${esc(section.description)}</p>${html}</section>`;
    }).join('');
    const date = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>${STYLES}</style></head><body>
        <div class="cover"><span class="eyebrow">Project export</span><h1>${esc(name)}</h1><p>${esc(date)}</p><ol>${chosen.map(section => `<li>${esc(section.label)}</li>`).join('')}</ol></div>
        ${body}</body></html>`;
}

/** Opens the browser's print dialog for the HTML, where the user picks "Save as PDF". */
export function printHtml(html: string, title: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
        document.body.appendChild(frame);
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        if (!doc || !win) { frame.remove(); reject(new Error('Printing is not available here.')); return; }
        doc.open(); doc.write(html); doc.close();
        const previousTitle = document.title;
        const cleanup = () => { document.title = previousTitle; setTimeout(() => frame.remove(), 500); resolve(); };
        const images = Array.from(doc.images);
        Promise.all(images.map(image => image.complete ? null : new Promise(done => { image.onload = image.onerror = done; }))).then(() => {
            // Chrome names the PDF after the top page's title.
            document.title = title;
            win.addEventListener('afterprint', cleanup, { once: true });
            win.focus();
            win.print();
            // Some browsers return from print() without firing afterprint.
            setTimeout(() => { if (frame.isConnected) cleanup(); }, 60000);
        });
    });
}
