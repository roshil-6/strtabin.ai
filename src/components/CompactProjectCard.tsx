import { useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ChevronDown, CheckCircle2, Folder, Brain, ListTodo, ArrowRight } from 'lucide-react';
import './CompactProjectCard.css';

type Props = {
    name: string;
    status: string;
    onOpen?: () => void;
    openLabel?: string;
    description?: string;
    taskCount?: number;
    completedTaskCount?: number;
    progress?: number;
    tone?: 'violet' | 'green' | 'blue' | 'amber';
    iconType?: 'folder' | 'brain';
    className?: string;
    children: ReactNode;
    lockedOpen?: boolean;
    selectionMode?: boolean;
    selected?: boolean;
    onSelect: (event: MouseEvent) => void;
};

export default function CompactProjectCard({
    name,
    status,
    onOpen,
    openLabel,
    description,
    taskCount = 0,
    completedTaskCount = 0,
    tone = 'violet',
    iconType = 'folder',
    className = '',
    children,
    lockedOpen = false,
    selectionMode = false,
    selected = false,
    onSelect,
}: Props) {
    const [pinned, setPinned] = useState(false);
    const detailsId = useId();
    const summary = useRef<HTMLButtonElement>(null);
    const expanded = !selectionMode && !onOpen && (pinned || lockedOpen);

    return (
        <article
            className={`compact-project-card ${className}`}
            data-expanded={expanded}
            data-tone={tone}
            onKeyDown={event => {
                if (event.key === 'Escape' && !lockedOpen) {
                    event.preventDefault();
                    summary.current?.focus();
                    setPinned(false);
                }
            }}
        >
            <button
                ref={summary}
                type="button"
                className="compact-project-summary"
                aria-expanded={selectionMode || onOpen ? undefined : expanded}
                aria-controls={selectionMode || onOpen ? undefined : detailsId}
                aria-pressed={selectionMode ? selected : undefined}
                aria-label={
                    selectionMode
                        ? `${selected ? 'Deselect' : 'Select'} ${name}`
                        : onOpen
                          ? `${openLabel || 'Open'}: ${name}`
                          : `${name}, ${status}. ${expanded ? 'Hide' : 'Show'} project details`
                }
                onClick={event => {
                    event.stopPropagation();
                    if (selectionMode) onSelect(event);
                    else if (onOpen) onOpen();
                    else setPinned(value => !value);
                }}
            >
                <span className="compact-project-top">
                    <span className="compact-project-icon" aria-hidden="true">
                        {iconType === 'brain' ? (
                            <Brain size={21} strokeWidth={1.75} />
                        ) : (
                            <Folder size={21} strokeWidth={1.75} />
                        )}
                    </span>
                    {selectionMode ? (
                        selected && <CheckCircle2 className="compact-project-chevron" size={18} />
                    ) : onOpen ? (
                        <ArrowRight className="compact-project-chevron" size={18} />
                    ) : (
                        <ChevronDown className="compact-project-chevron" size={18} />
                    )}
                </span>

                <span className="compact-project-identity">
                    <strong>{name}</strong>
                    <span className="compact-project-description">
                        {openLabel ||
                            description ||
                            'Redesigning and organizing core project ideas, execution plans, and next steps in your workspace.'}
                    </span>
                </span>

                <span className="compact-project-metadata">
                    <span className="compact-project-status" data-status={status}>
                        <i data-status={status} />
                        <span className="compact-project-meta-label">Status:</span>
                        <strong className="compact-project-status-value">{status}</strong>
                    </span>
                    <span className="compact-project-task-count">
                        <ListTodo size={14} aria-hidden="true" />
                        <span className="compact-project-meta-label">Tasks:</span>
                        <strong className="compact-project-task-value">
                            {completedTaskCount}/{taskCount}
                        </strong>
                    </span>
                </span>
            </button>
            <div id={detailsId} className="compact-project-details" hidden={!expanded}>
                {children}
            </div>
        </article>
    );
}
