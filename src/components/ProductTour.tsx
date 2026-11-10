import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Compass, MousePointerClick, X } from 'lucide-react';
import useStore from '../store/useStore';
import { isListedProject, isTeamProject } from '../lib/projectVisibility';
import { TOUR_STEPS, useTour } from '../lib/productTour';
import './ProductTour.css';

type Box = { top: number; left: number; width: number; height: number };
const PAD = 8;
const CARD_WIDTH = 360;

/** Most recent personal project, or a new one so every project step has something to show. */
function tourProject(): string {
    const { canvases, createCanvas } = useStore.getState();
    const recent = Object.values(canvases).filter(canvas => isListedProject(canvas) && !isTeamProject(canvas))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    return recent?.id || createCanvas('My first project');
}

/** Floating step-by-step guide over the real workspace. It highlights each tool and lets the user try it. */
export default function ProductTour() {
    const { active, index, projectId, go, end, setProject } = useTour();
    const navigate = useNavigate();
    const location = useLocation();
    const step = TOUR_STEPS[index];
    // What was found for which step; a new step starts out searching without resetting state in an effect.
    const [found, setFound] = useState<{ step: number; box: Box | null; searching: boolean }>({ step: -1, box: null, searching: true });
    const box = found.step === index ? found.box : null;
    const searching = found.step === index ? found.searching : Boolean(step.target);
    const card = useRef<HTMLDivElement>(null);
    const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 220 });
    const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

    const needsProject = step.path.includes(':id');
    const path = needsProject && projectId ? step.path.replace(':id', encodeURIComponent(projectId)) : step.path;

    // Open the step's screen (choosing a project first when the step lives inside one). This runs only
    // when the step changes, so the user can still click around the app without being pulled back.
    const locationRef = useRef(location);
    useEffect(() => { locationRef.current = location; }, [location]);
    useEffect(() => {
        if (!active) return;
        if (needsProject && !projectId) { setProject(tourProject()); return; }
        const here = locationRef.current;
        const [pathname, search = ''] = path.split('?');
        if (here.pathname !== pathname || (search && here.search !== `?${search}`)) navigate(path, { state: here.state });
    }, [active, path, needsProject, projectId, setProject, navigate]);

    // Find the highlighted element once the screen has rendered, then follow it as the page moves.
    useEffect(() => {
        if (!active) return;
        if (!step.target) return;
        const setBox = (value: Box | null) => setFound(previous => ({ step: index, box: value, searching: previous.step === index ? previous.searching : true }));
        const setSearching = (value: boolean) => setFound(previous => ({ step: index, box: previous.step === index ? previous.box : null, searching: value }));
        // Searching and following are separate: page resizes while a screen loads must not cancel the search.
        let frame = 0; let poll = 0; let element: HTMLElement | null = null; const started = performance.now();
        const visible = (node: HTMLElement) => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; };
        const measure = () => {
            if (!element) return;
            if (!element.isConnected) { element = null; setBox(null); find(); return; }
            const rect = element.getBoundingClientRect();
            setBox({ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 });
        };
        const find = () => {
            window.clearTimeout(poll);
            element = Array.from(document.querySelectorAll<HTMLElement>(step.target!)).find(visible) || null;
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top < 80 || rect.bottom > window.innerHeight - 40) element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                setSearching(false); measure(); return;
            }
            // Give lazy screens time to load (slow networks included); after that the card sits in the middle.
            if (performance.now() - started < 12000) poll = window.setTimeout(find, 150); else setSearching(false);
        };
        find();
        const follow = () => { if (!element) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
        window.addEventListener('scroll', follow, true); window.addEventListener('resize', follow);
        const resized = new ResizeObserver(follow); resized.observe(document.body);
        return () => { cancelAnimationFrame(frame); window.clearTimeout(poll); window.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow); resized.disconnect(); };
    }, [active, index, step.target, location.pathname, location.search]);

    // A tool opened from “Try it” (or by the user) shows its own dialog: step aside into the corner.
    const [toolDialog, setToolDialog] = useState(false);
    useEffect(() => {
        if (!active) return;
        const check = () => setToolDialog(Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')));
        const observer = new MutationObserver(check); observer.observe(document.body, { childList: true, subtree: true });
        check();
        return () => observer.disconnect();
    }, [active]);

    useEffect(() => {
        const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    useLayoutEffect(() => {
        if (card.current) setCardSize({ width: card.current.offsetWidth, height: card.current.offsetHeight });
    }, [index, box, active]);
    useEffect(() => { if (active) card.current?.focus({ preventScroll: true }); }, [active, index]);

    const next = useCallback(() => { if (index >= TOUR_STEPS.length - 1) end(); else go(index + 1); }, [index, go, end]);
    const back = useCallback(() => go(index - 1), [index, go]);
    useEffect(() => {
        if (!active) return;
        const onKey = (event: KeyboardEvent) => {
            const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
            if (event.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) end();
            else if (!typing && event.key === 'ArrowRight') next();
            else if (!typing && event.key === 'ArrowLeft' && index > 0) back();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, index, next, back, end]);

    if (!active) return null;

    const mobile = viewport.width < 640;
    let style: React.CSSProperties;
    let placement = 'center';
    if (toolDialog) { style = { bottom: 16, right: 16, width: Math.min(300, viewport.width - 32) }; placement = 'docked'; }
    else if (mobile) { style = {}; placement = 'sheet'; }
    else if (box) {
        const gap = 14; const width = Math.min(CARD_WIDTH, viewport.width - 32);
        const clampLeft = (left: number) => Math.max(16, Math.min(viewport.width - width - 16, left));
        const below = box.top + box.height + gap;
        const above = box.top - gap - cardSize.height;
        if (below + cardSize.height <= viewport.height - 16) { style = { top: below, left: clampLeft(box.left), width }; placement = 'below'; }
        else if (above >= 16) { style = { top: above, left: clampLeft(box.left), width }; placement = 'above'; }
        else if (box.left + box.width + gap + width <= viewport.width - 16) { style = { top: Math.max(16, Math.min(viewport.height - cardSize.height - 16, box.top)), left: box.left + box.width + gap, width }; placement = 'right'; }
        else if (box.left - gap - width >= 16) { style = { top: Math.max(16, Math.min(viewport.height - cardSize.height - 16, box.top)), left: box.left - gap - width, width }; placement = 'left'; }
        else { style = { bottom: 24, right: 24, width }; placement = 'corner'; }
    } else style = { width: Math.min(CARD_WIDTH + 40, viewport.width - 32) };

    const tryIt = () => {
        const element = step.target ? Array.from(document.querySelectorAll<HTMLElement>(step.target)).find(node => node.getBoundingClientRect().width > 0) : null;
        element?.click();
    };
    const missing = Boolean(step.target) && !box && !searching;

    return createPortal(<div className="tour-layer" data-placement={placement}>
        {box ? <div className="tour-spotlight" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} aria-hidden="true" />
            : <div className="tour-dim" aria-hidden="true" />}
        <div ref={card} className={`tour-card is-${placement}`} style={style} role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body" tabIndex={-1}>
            <header>
                <span className="tour-group"><Compass size={14} aria-hidden="true" />{step.group}</span>
                <span className="tour-count">{index + 1} of {TOUR_STEPS.length}</span>
                <button type="button" className="tour-close" aria-label="Close the tour" title="Close (Esc)" onClick={end}><X size={16} /></button>
            </header>
            <div className="tour-progress" aria-hidden="true"><i style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }} /></div>
            <h2 id="tour-title">{step.title}</h2>
            {toolDialog ? <p id="tour-body">Try it out, then close that window and press Next to continue.</p> : <p id="tour-body">{step.body}</p>}
            {missing && <p className="tour-note">This tool isn’t on screen right now{mobile ? ' on this screen size' : ''}. You can still read about it here.</p>}
            {step.tryLabel && box && !toolDialog && <button type="button" className="tour-try" onClick={tryIt}><MousePointerClick size={16} />{step.tryLabel}</button>}
            <footer>
                {step.guide ? <a className="tour-guide" href={`/features#${step.guide}`} target="_blank" rel="noreferrer"><BookOpen size={14} />Full guide</a> : <span />}
                <div className="tour-nav">
                    {index > 0 && <button type="button" onClick={back}><ArrowLeft size={15} />Back</button>}
                    <button type="button" className="tour-next" onClick={next}>{index === 0 ? 'Start the tour' : index === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}{index < TOUR_STEPS.length - 1 && <ArrowRight size={15} />}</button>
                </div>
            </footer>
        </div>
    </div>, document.body);
}
