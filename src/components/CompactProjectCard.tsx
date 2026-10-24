import { useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import './CompactProjectCard.css';
type Props = { name: string; status: string; className?: string; children: ReactNode; lockedOpen?: boolean; selectionMode?: boolean; selected?: boolean; onSelect: (event: MouseEvent) => void };
export default function CompactProjectCard({ name, status, className = '', children, lockedOpen = false, selectionMode = false, selected = false, onSelect }: Props) {
    const [pinned, setPinned] = useState(false);
    const detailsId = useId();
    const summary = useRef<HTMLButtonElement>(null);
    const expanded = !selectionMode && (pinned || lockedOpen);
    return <article className={`compact-project-card ${className}`} data-expanded={expanded} onKeyDown={event => { if (event.key === 'Escape' && !lockedOpen) { event.preventDefault(); summary.current?.focus(); setPinned(false); } }}>
        <button ref={summary} type="button" className="compact-project-summary" aria-expanded={selectionMode ? undefined : expanded} aria-controls={selectionMode ? undefined : detailsId} aria-pressed={selectionMode ? selected : undefined} aria-label={selectionMode ? `${selected ? 'Deselect' : 'Select'} ${name}` : `${name}, ${status}. ${expanded ? 'Hide' : 'Show'} project details`} onClick={event => { event.stopPropagation(); if (selectionMode) onSelect(event); else setPinned(value => !value); }}><span className="compact-project-identity"><strong>{name}</strong><span className="compact-project-status"><i data-status={status} />{status}</span></span>{selectionMode ? selected && <CheckCircle2 size={19} /> : <ChevronDown className="compact-project-chevron" size={17} />}</button>
        <div id={detailsId} className="compact-project-details" hidden={!expanded}>{children}</div>
    </article>;
}
