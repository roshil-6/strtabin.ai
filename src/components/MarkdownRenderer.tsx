import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Components } from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-white/95">{children}</strong>,
    em: ({ children }) => <em className="italic text-white/90">{children}</em>,
    h1: ({ children }) => <h1 className="text-xl font-black mt-5 mb-3 text-white tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-black mt-5 mb-2 text-white/90 tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 text-white/85">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
    li: ({ children }) => <li className="text-white/80">{children}</li>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            {children}
        </a>
    ),
    code: ({ inline, className, children, ...props }: any) => {
        if (inline) {
            return (
                <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
                    {children}
                </code>
            );
        }
        return (
            <div className="relative my-4 group">
                <div className="absolute top-0 right-0 px-2 py-1 text-[10px] uppercase font-bold tracking-widest text-white/30 bg-black/40 rounded-tr-xl rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    Code
                </div>
                <pre className="bg-black/40 border border-white/[0.06] rounded-xl p-4 overflow-x-auto text-[0.9em] font-mono text-white/70 leading-relaxed custom-scrollbar">
                    <code {...props}>{children}</code>
                </pre>
            </div>
        );
    },
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-primary/50 pl-4 py-1 my-3 bg-primary/5 rounded-r-lg text-white/70 italic">
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
    th: ({ children }) => <th className="px-4 py-3 font-bold text-white/80">{children}</th>,
    td: ({ children }) => <td className="px-4 py-3 text-white/70">{children}</td>,
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
