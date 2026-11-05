import { markdownPlainText } from './richText.ts';
export type BranchNode = { label: string; depth: number };
export type WritingBlock = { text: string } | { nodes: BranchNode[] };
const pattern = /```stratabin-branch\n([^]*?)\n```/g;
export function readWritingBlocks(value: string): WritingBlock[] {
    const blocks: WritingBlock[] = [];
    let end = 0;
    for (const match of value.matchAll(pattern)) {
        try {
            const nodes: unknown = JSON.parse(match[1]);
            if (!Array.isArray(nodes) || !nodes.length || nodes.length > 200 || !nodes.every((n, i) => n && typeof n.label === 'string' && Number.isInteger(n.depth) && n.depth >= 0 && n.depth <= 8 && (i === 0 ? n.depth === 0 : n.depth > 0 && n.depth <= nodes[i - 1].depth + 1))) continue;
            blocks.push({ text: value.slice(end, match.index) }, { nodes });
            end = match.index! + match[0].length;
        } catch { /* Preserve malformed blocks as ordinary writing. */ }
    }
    blocks.push({ text: value.slice(end) });
    return blocks;
}
export function writeWritingBlocks(blocks: WritingBlock[]): string {
    return blocks.map(block => 'text' in block ? block.text : '```stratabin-branch\n' + JSON.stringify(block.nodes) + '\n```').join('');
}

/** Readable text of stored writing: no Markdown symbols, highlight colours, branch JSON or split-column markers. */
export function writingPlainText(value:string):string {
    const text = (value || '').replace(/<<<HEADING_[AB]:(.*?)>>>/g, ' $1 ').replace(/<<<[A-Z_]+(?::[^>]*)?>>>/g, ' ');
    return readWritingBlocks(text).map(block => 'text' in block ? markdownPlainText(block.text) : block.nodes.map(node=>node.label).join(' ')).join(' ');
}
/** One-line preview of stored writing for cards and lists. */
export function writingPreview(value:string, length = 180):string {
    return writingPlainText(value).replace(/[\s]+/g, ' ').trim().slice(0, length);
}
/** Word count of stored writing, ignoring formatting markup. */
export function writingWordCount(value?:string):number {
    return writingPlainText(value || '').split(/[\s]+/).filter(Boolean).length;
}
