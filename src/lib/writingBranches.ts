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

export function writingPlainText(value:string):string {
    return readWritingBlocks(value).map(block => 'text' in block ? block.text : block.nodes.map(node=>node.label).join(' ')).join(' ');
}
