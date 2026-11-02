import { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { useParams, useSearchParams } from 'react-router-dom';
import { Columns2, Square } from 'lucide-react';
import WritingSection from './WritingSection';
import BrainstormBoard from './BrainstormBoard';

const SPLIT_KEY = 'stratabin-split-view';
const RATIO_KEY = 'stratabin-split-ratio';
const readSplit = () => { try { return localStorage.getItem(SPLIT_KEY) === '1'; } catch { return false; } };
const readRatio = () => { try { const value = Number(localStorage.getItem(RATIO_KEY)); return value >= 25 && value <= 75 ? value : 50; } catch { return 50; } };
const wideQuery = '(min-width: 900px)';

export default function Canvas() {
    const { id } = useParams<{ id: string }>();
    const [params] = useSearchParams();
    const [sceneBoard, setSceneBoard] = useState(false);
    const [splitPreferred, setSplitPreferred] = useState(readSplit);
    const [ratio, setRatio] = useState(readRatio);
    const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia(wideQuery).matches);
    const container = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const board = params.get('view') === 'flow';
    const split = splitPreferred && wide;
    const name = useStore(state => state.canvases[id || '']?.name || state.canvases[id || '']?.title || 'Project');
    useEffect(() => { document.title = `${split ? 'Writing + Flow' : board ? 'Flow' : 'Writing'} — ${name} | Stratabin`; }, [board, split, name]);
    useEffect(() => {
        const media = window.matchMedia(wideQuery);
        const change = () => setWide(media.matches);
        media.addEventListener('change', change);
        return () => media.removeEventListener('change', change);
    }, []);
    useEffect(() => { try { localStorage.setItem(SPLIT_KEY, splitPreferred ? '1' : '0'); } catch { /* preference stays for this session */ } }, [splitPreferred]);
    useEffect(() => { try { localStorage.setItem(RATIO_KEY, String(Math.round(ratio))); } catch { /* preference stays for this session */ } }, [ratio]);
    if (!id) return null;

    const splitToggle = wide && <button type="button" className="studio-split-toggle" aria-pressed={split} title={split ? 'Show a single section' : 'See writing and flow side by side'} onClick={() => setSplitPreferred(value => !value)}>
        {split ? <Square size={15} /> : <Columns2 size={15} />}<span>{split ? 'Single view' : 'Split view'}</span>
    </button>;
    const resize = (clientX: number) => {
        const rect = container.current?.getBoundingClientRect();
        if (!rect || !rect.width) return;
        setRatio(Math.max(25, Math.min(75, ((clientX - rect.left) / rect.width) * 100)));
    };

    return (
        <div className="project-studio flex h-full theme-page overflow-hidden">
            <main className="flex flex-1 min-w-0 flex-col">
                {split ? <>
                    <div className="manuscript-toolbar studio-bar"><span className="studio-split-label">Writing &amp; Flow</span>{splitToggle}</div>
                    <div ref={container} className="studio-split flex-1 min-h-0">
                        <section className="studio-split-pane" style={{ flexBasis: `${ratio}%` }} aria-label="Writing">
                            <WritingSection key={`${id}:split-writing`} canvasId={id} initialView="document" />
                        </section>
                        <div role="separator" aria-orientation="vertical" aria-label="Resize split view" aria-valuemin={25} aria-valuemax={75} aria-valuenow={Math.round(ratio)} tabIndex={0} className="studio-split-divider"
                            onKeyDown={event => { if (event.key === 'ArrowLeft') setRatio(value => Math.max(25, value - 5)); if (event.key === 'ArrowRight') setRatio(value => Math.min(75, value + 5)); }}
                            onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); }}
                            onPointerMove={event => { if (dragging.current) resize(event.clientX); }}
                            onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}
                            onDoubleClick={() => setRatio(50)} />
                        <section className="studio-split-pane" style={{ flexBasis: `${100 - ratio}%` }} aria-label="Flow">
                            <BrainstormBoard key={`${id}:split-flow`} canvasId={id} />
                        </section>
                    </div>
                </> : <>
                    {(board || wide) && <div className="manuscript-toolbar studio-bar">
                        {board ? <div role="group" aria-label="Flow workspace"><button aria-pressed={!sceneBoard} onClick={() => setSceneBoard(false)}>Brainstorming</button><button aria-pressed={sceneBoard} onClick={() => setSceneBoard(true)}>Parts &amp; sections</button></div> : <span className="studio-split-label">Writing</span>}
                        {splitToggle}
                    </div>}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {board && !sceneBoard ? <BrainstormBoard key={id} canvasId={id} /> : <WritingSection key={`${id}:${board}`} canvasId={id} initialView={board ? 'cards' : 'document'} />}
                    </div>
                </>}
            </main>
        </div>
    );
}
