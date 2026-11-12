import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Drag cards between stage columns on a board.
 * Mouse: drag a card from anywhere (except form controls). Touch: drag by the grip, so the page still scrolls.
 * Keyboard: focus the grip and press Left / Right to move a card to the previous / next stage.
 */
type Options<S extends string> = { stages: readonly S[]; onMove: (id: string, stage: S) => void; disabled?: boolean };

type Active = { owner: object; finish: () => void };
/** Only one card can be dragged at a time, across every board. */
let activeDrag: Active | null = null;

const INTERACTIVE = 'select, input, textarea, [role="menu"], [role="menuitem"], [contenteditable="true"]';
const EDGE = 64;

function scrollParents(element: HTMLElement): HTMLElement[] {
    const list: HTMLElement[] = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        const scrollsY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
        const scrollsX = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
        if (scrollsY || scrollsX) list.push(node);
    }
    const root = document.scrollingElement as HTMLElement | null;
    if (root && !list.includes(root)) list.push(root);
    return list;
}

export function useStageDrag<S extends string>({ stages, onMove, disabled = false }: Options<S>) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overStage, setOverStage] = useState<S | null>(null);
    const [board, setBoard] = useState<HTMLElement | null>(null);
    const [owner] = useState(() => ({}));
    useEffect(() => () => { if (activeDrag?.owner === owner) activeDrag.finish(); }, [owner]);

    const stageAt = (x: number, y: number): S | null => {
        if (!board) return null;
        const column = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-stage]');
        if (column && board.contains(column)) return (column.dataset.dropStage as S) || null;
        // Over a gap or below a short column: snap to the nearest column while the pointer is on the board.
        const area = board.getBoundingClientRect();
        if (x < area.left - 24 || x > area.right + 24 || y < area.top - 24 || y > area.bottom + 24) return null;
        let best: { stage: S; distance: number } | null = null;
        board.querySelectorAll<HTMLElement>('[data-drop-stage]').forEach(element => {
            const box = element.getBoundingClientRect();
            const dx = Math.max(box.left - x, 0, x - box.right), dy = Math.max(box.top - y, 0, y - box.bottom);
            const distance = Math.hypot(dx, dy);
            if (!best || distance < best.distance) best = { stage: element.dataset.dropStage as S, distance };
        });
        return (best as { stage: S } | null)?.stage ?? null;
    };

    const begin = (event: ReactPointerEvent<HTMLElement>, id: string, from: S, immediate: boolean) => {
        if (disabled || activeDrag || (event.pointerType === 'mouse' && event.button !== 0)) return;
        const source = event.currentTarget.closest<HTMLElement>('[data-drag-item]') || event.currentTarget;
        const rect = source.getBoundingClientRect();
        const state = {
            startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
            offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
            baseX: 0, baseY: 0, started: false, frame: 0, over: null as S | null,
            ghost: null as HTMLElement | null, scrollers: [] as HTMLElement[],
        };

        const place = () => {
            if (state.ghost) state.ghost.style.transform = `translate(${state.x - state.offsetX - state.baseX}px, ${state.y - state.offsetY - state.baseY}px) rotate(1.5deg)`;
            const next = stageAt(state.x, state.y);
            if (next !== state.over) { state.over = next; setOverStage(next); }
        };
        const tick = () => {
            for (const element of state.scrollers) {
                const root = element === document.scrollingElement;
                const box = root ? { top: 0, bottom: innerHeight, left: 0, right: innerWidth } : element.getBoundingClientRect();
                let dy = 0, dx = 0;
                if (element.scrollHeight > element.clientHeight) {
                    if (state.y < box.top + EDGE) dy = -Math.ceil((box.top + EDGE - state.y) / 4);
                    else if (state.y > box.bottom - EDGE) dy = Math.ceil((state.y - box.bottom + EDGE) / 4);
                }
                if (element.scrollWidth > element.clientWidth) {
                    if (state.x < box.left + EDGE) dx = -Math.ceil((box.left + EDGE - state.x) / 4);
                    else if (state.x > box.right - EDGE) dx = Math.ceil((state.x - box.right + EDGE) / 4);
                }
                if (!dx && !dy) continue;
                const before = element.scrollTop + element.scrollLeft;
                element.scrollBy(dx, dy);
                if (element.scrollTop + element.scrollLeft !== before) { place(); break; }
            }
            state.frame = requestAnimationFrame(tick);
        };
        const start = () => {
            state.started = true;
            window.getSelection()?.removeAllRanges();
            const ghost = source.cloneNode(true) as HTMLElement;
            const sourceSelects = source.querySelectorAll('select');
            ghost.querySelectorAll('select').forEach((select, index) => { select.value = sourceSelects[index]?.value ?? select.value; });
            ghost.removeAttribute('id');
            ghost.removeAttribute('data-drag-item');
            ghost.setAttribute('aria-hidden', 'true');
            ghost.classList.add('stage-drag-ghost');
            Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px`, left: '0px', top: '0px', transform: 'none' });
            // Keep the copy inside the board so it keeps the board's styles; measure its real origin in case an ancestor is transformed.
            (board || document.body).appendChild(ghost);
            const origin = ghost.getBoundingClientRect();
            state.baseX = origin.left; state.baseY = origin.top;
            state.ghost = ghost;
            state.scrollers = scrollParents(source);
            document.body.classList.add('stage-dragging');
            setDraggingId(id);
            place();
            state.frame = requestAnimationFrame(tick);
        };
        const finish = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            window.removeEventListener('keydown', escape);
            cancelAnimationFrame(state.frame);
            state.ghost?.remove();
            document.body.classList.remove('stage-dragging');
            activeDrag = null;
            setDraggingId(null);
            setOverStage(null);
        };
        const move = (next: PointerEvent) => {
            if (next.pointerId !== event.pointerId) return;
            state.x = next.clientX; state.y = next.clientY;
            if (!state.started) {
                if (Math.hypot(state.x - state.startX, state.y - state.startY) < 6) return;
                start();
            }
            next.preventDefault();
            place();
        };
        const end = (next: PointerEvent) => {
            if (next.pointerId !== event.pointerId) return;
            const target = state.started && next.type === 'pointerup' ? stageAt(next.clientX, next.clientY) : null;
            if (state.started) {
                // The browser fires a click after the drop; it must not open the card.
                const swallow = (click: MouseEvent) => { click.preventDefault(); click.stopPropagation(); };
                window.addEventListener('click', swallow, { capture: true, once: true });
                setTimeout(() => window.removeEventListener('click', swallow, true), 0);
            }
            finish();
            if (target && target !== from) onMove(id, target);
        };
        const escape = (key: KeyboardEvent) => { if (key.key === 'Escape') finish(); };

        activeDrag = { owner, finish };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        window.addEventListener('keydown', escape);
        if (immediate) start();
    };

    return {
        /** Callback ref for the board element. */
        bindBoard: setBoard,
        draggingId,
        overStage,
        /** Spread on each column. */
        columnProps: (stage: S) => ({ 'data-drop-stage': stage, 'data-drop-over': draggingId && overStage === stage ? 'true' : undefined }),
        /** Spread on each card: a mouse can drag it from anywhere. */
        itemProps: (id: string, stage: S) => ({
            'data-drag-item': id,
            'data-drag-source': draggingId === id ? 'true' : undefined,
            onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
                if (event.pointerType !== 'mouse' || (event.target as Element).closest(INTERACTIVE)) return;
                begin(event, id, stage, false);
            },
        }),
        /** Spread on a grip button inside each card: works for touch, mouse and keyboard. */
        handleProps: (id: string, stage: S, label: string) => ({
            type: 'button' as const,
            className: 'stage-grip',
            disabled,
            'aria-label': `Move ${label} to another stage. Drag, or press left or right arrow.`,
            title: 'Drag to move',
            onPointerDown: (event: ReactPointerEvent<HTMLElement>) => { event.stopPropagation(); begin(event, id, stage, event.pointerType !== 'mouse'); },
            onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const next = stages[stages.indexOf(stage) + (event.key === 'ArrowRight' ? 1 : -1)];
                if (next) onMove(id, next);
            },
        }),
    };
}
