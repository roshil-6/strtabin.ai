import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Plus } from 'lucide-react';
import { readWritingBlocks, writeWritingBlocks } from '../lib/writingBranches';

export default function WritingDocument({ value, onChange, fontSize, readOnly, inputRef }: {
    value: string; onChange: (value: string) => void; fontSize: number; readOnly: boolean; inputRef: RefObject<HTMLTextAreaElement>;
}) {
    const documentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = documentRef.current;
        if (!element) return;
        const resize = () => {
            const scroller = element.closest('.writing-scroll-area');
            const scrollTop = scroller?.scrollTop;
            element.querySelectorAll<HTMLTextAreaElement>(':scope > textarea').forEach(input => {
                input.style.height = 'auto';
                input.style.height = `${input.scrollHeight}px`;
            });
            if (scroller && scrollTop !== undefined) scroller.scrollTop = scrollTop;
        };
        resize();
        let width = element.clientWidth;
        const observer = new ResizeObserver(() => {
            if (element.clientWidth !== width) { width = element.clientWidth; resize(); }
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [value, fontSize]);
    const blocks = readWritingBlocks(value);
    return <div ref={documentRef} className="writing-document-blocks" style={{ fontSize }}>
        {blocks.map((block, index) => 'text' in block ? <textarea key={index}
            ref={index === 0 ? inputRef : undefined} aria-label={index === 0 ? 'Document content' : `Writing after branch ${index}`}
            value={block.text} readOnly={readOnly} placeholder={index === 0 ? 'Start with a thought. Make room for the next one.' : 'Continue writing…'}
            onChange={event => { blocks[index] = { text: event.target.value }; onChange(writeWritingBlocks(blocks)); }} /> :
            <section key={index} className="writing-inline-branch" aria-label="Writing hierarchy">
                {block.nodes.map((node, nodeIndex) => <div key={nodeIndex} className={`writing-branch-node ${nodeIndex === 0 ? 'is-topic' : ''}`} style={{ marginLeft: `${node.depth * 24}px` }}>
                    <span className="writing-branch-label">
                    <span className="writing-branch-measure" aria-hidden="true">{node.label || ' '}</span>
                    <input aria-label={nodeIndex === 0 ? 'Hierarchy topic' : `Branch ${nodeIndex}`} value={node.label} readOnly={readOnly}
                        onChange={event => { node.label = event.target.value; onChange(writeWritingBlocks(blocks)); }} />
                    </span>
                    {!readOnly && node.depth < 8 && block.nodes.length < 200 && <button aria-label={`Add child to ${node.label || 'branch'}`} title="Add child branch" onClick={() => {
                        let next = nodeIndex + 1;
                        while (next < block.nodes.length && block.nodes[next].depth > node.depth) next++;
                        block.nodes.splice(next, 0, { label: 'New branch', depth: node.depth + 1 }); onChange(writeWritingBlocks(blocks));
                    }}><Plus size={16} /></button>}
                </div>)}
                {!readOnly && <button className="writing-branch-convert" onClick={() => {
                    blocks[index] = { text: '\n' + block.nodes.map(n => '  '.repeat(n.depth) + (n.depth ? '- ' : '') + n.label).join('\n') + '\n' };
                    onChange(writeWritingBlocks(blocks));
                }}>Convert to plain text</button>}
            </section>)}
    </div>;
}
