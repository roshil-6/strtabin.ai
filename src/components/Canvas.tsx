import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { useParams, useSearchParams } from 'react-router-dom';
import WritingSection from './WritingSection';
import BrainstormBoard from './BrainstormBoard';

export default function Canvas() {
    const { id } = useParams<{ id: string }>();
    const [params] = useSearchParams();
    const [sceneBoard, setSceneBoard] = useState(false);
    const board = params.get('view') === 'flow';
    const name = useStore(state => state.canvases[id || '']?.name || state.canvases[id || '']?.title || 'Project');
    useEffect(() => { document.title = `${board ? 'Flow' : 'Writing'} — ${name} | Stratabin`; }, [board, name]);
    if (!id) return null;
    return (
        <div className="project-studio flex h-full theme-page overflow-hidden">
            <main className="flex flex-1 min-w-0 flex-col ">
                {board && <div className="manuscript-toolbar"><div role="group" aria-label="Flow workspace"><button aria-pressed={!sceneBoard} onClick={() => setSceneBoard(false)}>Brainstorming</button><button aria-pressed={sceneBoard} onClick={() => setSceneBoard(true)}>Parts & sections</button></div></div>}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {board && !sceneBoard ? <BrainstormBoard key={id} canvasId={id} /> : <WritingSection key={`${id}:${board}`} canvasId={id} initialView={board ? 'cards' : 'document'} />}
                </div>
            </main>

        </div>
    );
}
