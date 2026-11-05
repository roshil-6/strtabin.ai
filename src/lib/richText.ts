/**
 * Converts between the Markdown stored for writing pages and the HTML shown in the
 * rich-text editor. Each Markdown line is its own block so text typed in the old
 * plain editor keeps its line breaks exactly.
 */

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = (url: string) => /^(https?:|mailto:|#|\/)/i.test(url.trim()) ? url.trim() : '';

/** Inline Markdown → HTML: **bold**, _italic_ / *italic*, `code`, ==highlight==, [link](url). */
export function inlineToHtml(text: string): string {
    let out = '';
    let index = 0;
    const rest = () => text.slice(index);
    while (index < text.length) {
        const char = text[index];
        if (char === '\\' && index + 1 < text.length && /[\\*_`=[\]#>~.)+-]/.test(text[index + 1])) { out += escapeHtml(text[index + 1]); index += 2; continue; }
        const code = /^`([^`\n]+)`/.exec(rest());
        if (code) { out += `<code>${escapeHtml(code[1])}</code>`; index += code[0].length; continue; }
        const link = /^\[([^\]\n]*)\]\(([^)\s]*)\)/.exec(rest());
        if (link) {
            const url = safeUrl(link[2]);
            out += url ? `<a href="${escapeHtml(url)}">${inlineToHtml(link[1])}</a>` : inlineToHtml(link[1]);
            index += link[0].length; continue;
        }
        const pair = (marker: string, tag: string) => {
            if (!text.startsWith(marker, index)) return false;
            const close = text.indexOf(marker, index + marker.length + 1);
            if (close === -1) return false;
            const inner = text.slice(index + marker.length, close);
            if (!inner.trim() || /^\s|\s$/.test(inner)) return false;
            out += `<${tag}>${inlineToHtml(inner)}</${tag}>`;
            index = close + marker.length;
            return true;
        };
        if (pair('**', 'strong') || pair('==', 'mark') || pair('~~', 's') || pair('*', 'em')) continue;
        // `_` only counts at word edges so snake_case words stay plain.
        if (char === '_' && !/\w/.test(text[index - 1] || '')) {
            const close = text.indexOf('_', index + 2);
            if (close !== -1 && !/\w/.test(text[close + 1] || '') && pair('_', 'em')) continue;
        }
        out += escapeHtml(char);
        index++;
    }
    return out;
}

/** Markdown → editor HTML. */
export function markdownToHtml(markdown: string): string {
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const html: string[] = [];
    const line = (text: string) => text ? `<div>${inlineToHtml(text)}</div>` : '<div><br></div>';
    for (let i = 0; i < lines.length; i++) {
        const current = lines[i];
        if (/^```/.test(current)) {
            const end = lines.findIndex((value, at) => at > i && /^```\s*$/.test(value));
            if (end !== -1) { html.push(`<pre>${escapeHtml(lines.slice(i + 1, end).join('\n')) || '<br>'}</pre>`); i = end; continue; }
        }
        const heading = /^(#{1,3}) (.*)$/.exec(current);
        if (heading) { html.push(`<h${heading[1].length}>${inlineToHtml(heading[2]) || '<br>'}</h${heading[1].length}>`); continue; }
        const group = (pattern: RegExp, wrap: (items: string[]) => string) => {
            if (!pattern.test(current)) return false;
            const items: string[] = [];
            while (i < lines.length && pattern.test(lines[i])) items.push(lines[i++].replace(pattern, ''));
            i--;
            html.push(wrap(items));
            return true;
        };
        if (group(/^> ?/, items => `<blockquote>${items.map(line).join('')}</blockquote>`)) continue;
        if (group(/^\s*[-*+] /, items => `<ul>${items.map(item => `<li>${inlineToHtml(item) || '<br>'}</li>`).join('')}</ul>`)) continue;
        if (group(/^\s*\d+[.)] /, items => `<ol>${items.map(item => `<li>${inlineToHtml(item) || '<br>'}</li>`).join('')}</ol>`)) continue;
        html.push(line(current));
    }
    return html.join('');
}

/** Escape characters that would otherwise turn plain typed text into formatting. */
export function escapeInline(text: string): string {
    return text.replace(/([\\*`[\]])/g, '\\$1').replace(/==/g, '\\==').replace(/~~/g, '\\~~')
        .replace(/(^|[^\w])_/g, '$1\\_').replace(/_(?=[^\w]|$)/g, '\\_');
}
const escapeLineStart = (line: string) => line.replace(/^(\d+)([.)] )/, '$1\\$2').replace(/^(#{1,6} |>|[-+] )/, '\\$1');

/** Minimal DOM shape so the converter can be tested without a browser. */
export type RichNode = { nodeType: number; nodeName: string; textContent: string | null; childNodes: ArrayLike<RichNode>; getAttribute?: (name: string) => string | null; style?: { fontWeight?: string; fontStyle?: string; backgroundColor?: string } };

const BLOCK = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER']);
const isBlock = (node: RichNode) => node.nodeType === 1 && BLOCK.has(node.nodeName);

function inlineMarkdown(node: RichNode): string {
    if (node.nodeType === 3) return escapeInline((node.textContent || '').replace(/\u00a0/g, ' ').replace(/\u200b/g, ''));
    if (node.nodeType !== 1) return '';
    if (node.nodeName === 'BR') return '\n';
    const inner = Array.from(node.childNodes).map(inlineMarkdown).join('');
    const wrap = (marker: string) => {
        if (!inner.trim() || inner.includes('\n')) return inner;
        const lead = inner.match(/^\s*/)![0];
        const trail = inner.match(/\s*$/)![0];
        return lead + marker + inner.trim() + marker + trail;
    };
    switch (node.nodeName) {
        case 'B': case 'STRONG': return wrap('**');
        case 'I': case 'EM': return wrap('_');
        case 'MARK': return wrap('==');
        case 'S': case 'STRIKE': case 'DEL': return wrap('~~');
        case 'CODE': { const text = (node.textContent || '').replace(/`/g, ''); return text ? '`' + text + '`' : ''; }
        case 'A': { const href = node.getAttribute?.('href') || ''; return href && inner.trim() ? `[${inner}](${href})` : inner; }
        case 'SPAN': {
            const bold = /^(bold|[6-9]00)$/.test(node.style?.fontWeight || '');
            const italic = node.style?.fontStyle === 'italic';
            const background = (node.style?.backgroundColor || '').replace(/\s/g, '');
            const highlighted = !!background && background !== 'transparent' && !/^rgba\(\d+,\d+,\d+,0\)$/.test(background);
            let text = inner;
            if (highlighted) text = wrap('==');
            if (italic) text = highlighted ? `_${text}_` : wrap('_');
            if (bold) text = italic || highlighted ? `**${text}**` : wrap('**');
            return text;
        }
        default: return inner;
    }
}

/** Lines of a container, treating inline runs and block children like the browser lays them out. */
function blockLines(container: RichNode): string[] {
    const lines: string[] = [];
    let current = '';
    let open = false;
    const flush = () => { if (open) lines.push(...current.split('\n').map(escapeLineStart)); current = ''; open = false; };
    for (const child of Array.from(container.childNodes)) {
        if (isBlock(child)) { flush(); lines.push(...blockMarkdown(child)); continue; }
        const text = inlineMarkdown(child);
        if (child.nodeName === 'BR') { lines.push(escapeLineStart(current)); current = ''; open = false; continue; }
        current += text; open = true;
    }
    flush();
    return lines;
}

function blockMarkdown(node: RichNode): string[] {
    const tag = node.nodeName;
    if (/^H[1-6]$/.test(tag)) {
        const level = Math.min(3, Number(tag[1]));
        const text = blockLines(node).join(' ').trim();
        return [text ? '#'.repeat(level) + ' ' + text : ''];
    }
    if (tag === 'PRE') {
        const text = (node.textContent || '').replace(/\u00a0/g, ' ').replace(/\n$/, '');
        return ['```', ...text.split('\n'), '```'];
    }
    if (tag === 'BLOCKQUOTE') return blockLines(node).map(line => '> ' + line);
    if (tag === 'UL' || tag === 'OL') {
        let number = 0;
        return Array.from(node.childNodes).flatMap(child => {
            if (child.nodeName !== 'LI') return isBlock(child) ? blockMarkdown(child) : [];
            const [first = '', ...more] = blockLines(child);
            number++;
            return [(tag === 'OL' ? `${number}. ` : '- ') + first, ...more.map(line => '  ' + line)];
        });
    }
    const lines = blockLines(node);
    return lines.length ? lines : [''];
}

/** Editor DOM → Markdown. */
export function htmlToMarkdown(root: RichNode): string {
    return root.childNodes.length ? blockLines(root).join('\n') : '';
}

/** Plain text of stored Markdown, for summaries and word counts. */
export function markdownPlainText(markdown: string): string {
    return markdown.replace(/^```.*$/gm, '').replace(/^(#{1,6} |> ?|\s*[-*+] |\s*\d+[.)] )/gm, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/(\*\*|==|~~|`)/g, '').replace(/(^|\W)[_*](\S[^_*]*?\S|\S)[_*](?=\W|$)/g, '$1$2').replace(/\\([\\*_`=[\]#>~.)+-])/g, '$1');
}
