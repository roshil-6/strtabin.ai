import { useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import './CompactProjectCard.css';
type Props = { name: string; status: string; className?: string; children: ReactNode; lockedOpen?: boolean; selectionMode?: boolean; selected?: boolean; onSelect: (event: MouseEvent) => void };
export default function CompactProjectCard({ name, status, className = '', children, lockedOpen = false, selectionMode = false, selected = false, onSelect }: Props) {
    const [hovered, setHovered] = useState(false);
    const [keyboardFocus, setKeyboardFocus] = useState(false);
    const [pinned, setPinned] = useState(false);
    const detailsId = useId();
    const pointerType = useRef('');
    const summary = useRef<HTMLButtonElement>(null);
    const expanded = !selectionMode && (hovered || keyboardFocus || pinned || lockedOpen);
    return <article className={`compact-project-card ${className}`} data-expanded={expanded} onKeyDown={event => { if (event.key === 'Escape' && !lockedOpen) { event.preventDefault(); summary.current?.focus(); setHovered(false); setKeyboardFocus(false); setPinned(false); } }} onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)} onFocusCapture={event => { if (event.target.matches(':focus-visible')) setKeyboardFocus(true); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false); }}>
        <button ref={summary} type="button" onPointerDown={event => { pointerType.current = event.pointerType; }} className="compact-project-summary" aria-expanded={selectionMode ? undefined : expanded} aria-controls={selectionMode ? undefined : detailsId} aria-pressed={selectionMode ? selected : undefined} aria-label={selectionMode ? `${selected ? 'Deselect' : 'Select'} ${name}` : `${name}, ${status}. Show project details`} onClick={event => { event.stopPropagation(); if (selectionMode) onSelect(event); else if (event.detail === 0 || pointerType.current !== 'mouse') setPinned(value => !value); }}><span className="compact-project-identity"><strong>{name}</strong><span className="compact-project-status"><i data-status={status} />{status}</span></span>{selectionMode ? selected && <CheckCircle2 size={19} /> : <ChevronDown className="compact-project-chevron" size={17} />}</button>
        <div id={detailsId} className="compact-project-details" hidden={!expanded}>{children}</div>
    </article>;
}
