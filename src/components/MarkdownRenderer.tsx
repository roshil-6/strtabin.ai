import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Components } from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-[var(--text)]">{children}</strong>,
    em: ({ children }) => <em className="italic text-[var(--text)]">{children}</em>,
    h1: ({ children }) => <h1 className="text-xl font-black mt-5 mb-3 text-[var(--text)] tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-black mt-5 mb-2 text-[var(--text)] tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 text-[var(--text-secondary)]">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
    li: ({ children }) => <li className="text-[var(--text-secondary)]">{children}</li>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            {children}
        </a>
    ),
    code: ({ className, children }) => <code className={`rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[0.9em] font-mono ${className || ''}`}>{children}</code>,
    pre: ({ children }) => <pre className="my-4 bg-[var(--input-bg)] border border-[var(--border-strong)] rounded-xl p-4 overflow-x-auto text-[0.9em] font-mono leading-relaxed custom-scrollbar [&>code]:bg-transparent [&>code]:p-0">{children}</pre>,
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-primary/50 pl-4 py-1 my-3 bg-primary/5 rounded-r-lg text-[var(--text-secondary)] italic">
            {children}
        </blockquote>
    ),
    table: ({ children }) => (
        <div className="overflow-x-auto my-4 custom-scrollbar rounded-xl border border-white/[0.06]">
            <table className="w-full text-left border-collapse text-sm">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-white/5 border-b border-white/[0.06]">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-white/[0.04]">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-4 py-3 font-bold text-[var(--text-secondary)]">{children}</th>,
    td: ({ children }) => <td className="px-4 py-3 text-[var(--text-secondary)]">{children}</td>,
};

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-body ${className}`}>
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
