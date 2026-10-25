import { availableBoardPosition, duplicateBoardSelection, projectBoardPatch, readableBoardLabel, boardConnectionError } from '../lib/boardOperations';
import { createContext, useContext, useCallback, useRef, useState, useLayoutEffect, useEffect, useMemo, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position, NodeResizer, ConnectionMode, MarkerType, applyNodeChanges, applyEdgeChanges, addEdge, reconnectEdge, useReactFlow, useNodesInitialized, type Node, type Edge, type NodeProps, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MousePointer2, Hand, StickyNote, Type, Square, Circle, Diamond, ArrowUpRight, Undo2, Redo2, Copy, Trash2, Download, ImagePlus, Sparkles, LayoutTemplate, X, Plus, GripHorizontal } from 'lucide-react';
import useStore from '../store/useStore';
import './BrainstormBoard.css';

type Tool = 'select' | 'hand' | 'sticky' | 'text' | 'rectangle' | 'circle' | 'diamond' | 'connect';
type Snapshot = { nodes: Node[]; edges: Edge[] };
const COLORS = ['#f9e8a0', '#d9eacc', '#d8e7fb', '#efdafa', '#f9d6c6', '#ffffff'];
const BoardHistoryContext = createContext<() => void>(() => {});
const BoardEditingContext = createContext<{ tool: Tool; editingId: string | null; edit: (id: string | null) => void; update: (id: string, label: string) => void; addChild: (id: string) => void; finish: (id: string) => void }>({ tool: 'select', editingId: null, edit: () => {}, update: () => {}, addChild: () => {}, finish: () => {} });
const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

function BoardObject({ id, data, selected }: NodeProps) {
    const checkpoint = useContext(BoardHistoryContext);
    const { tool, editingId, edit, update, addChild, finish } = useContext(BoardEditingContext);
    const editing = editingId === id && tool === 'select';
    const textInput = useRef<HTMLTextAreaElement>(null);
    useLayoutEffect(() => { if (editing) textInput.current?.focus({ preventScroll: true }); }, [editing]);
    const beginEditing = () => { if (tool !== 'select') return; if (!editing) checkpoint(); edit(id); };
    const kind = String(data.kind || 'sticky');
    return <div className={`board-object object-${kind} ${selected ? 'object-selected' : ''}`} style={{ background: String(data.color || COLORS[0]), '--object-color': String(data.color || COLORS[0]) } as CSSProperties} onDoubleClick={beginEditing}>
        <NodeResizer isVisible={selected} minWidth={180} minHeight={160} onResizeStart={checkpoint} />
        {[Position.Top, Position.Right, Position.Bottom, Position.Left].map(position => <Handle key={position} id={position} type="source" position={position} />)}
        <div className="board-node-heading" title="Drag to move idea"><GripHorizontal size={15}/><span>{data.parentIdeaId ? 'SUB-IDEA' : 'IDEA'}</span></div>
        {editing ? <textarea ref={textInput} className="nodrag nopan nowheel" aria-label={data.parentIdeaId ? "Sub-idea text" : "Idea text"} placeholder={kind === 'text' ? 'Add text' : 'Write your idea...'} value={readableBoardLabel(data.label)} readOnly={tool !== 'select'} style={{ pointerEvents: tool === 'select' ? 'auto' : 'none' }} tabIndex={tool === 'select' ? 0 : -1} onFocus={beginEditing} onBlur={() => finish(id)} onChange={event => update(id, event.target.value)} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.currentTarget.blur(); } }} /> : <div className="board-text-preview" role="button" tabIndex={tool === 'select' ? 0 : -1} aria-label="Edit idea text" onClick={beginEditing} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); beginEditing(); } }}>{readableBoardLabel(data.label) || 'Click to write your idea…'}</div>}
        {tool === 'select' && <button className="board-add-child nodrag nopan" aria-label="Add connected sub-idea" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); addChild(id); }}><Plus size={14}/>Sub-idea</button>}
    </div>;
}
const NODE_TYPES = { brainstorm: BoardObject, default: BoardObject, text: BoardObject, question: BoardObject, decision: BoardObject, image: BoardObject, subproject: BoardObject };

function Board({ canvasId }: { canvasId: string }) {
    const project = useStore(state => state.canvases[canvasId]);
    const nodes = project?.nodes || EMPTY_NODES;
    const edges = project?.edges || EMPTY_EDGES;
    const [panBoard, setPanBoard] = useState(true);
    const [tool, setTool] = useState<Tool>('select');
    const flowNodes = useMemo(() => nodes.map(node => ({ ...node, draggable: tool === 'select', dragHandle: undefined })), [nodes, tool]);
    const pendingFocus = useRef<string[] | null>(null);
    const nodesReady = useNodesInitialized();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [color, setColor] = useState(COLORS[0]);
    const [templates, setTemplates] = useState(false);
    const [help, setHelp] = useState('');
    const [history, setHistory] = useState<Snapshot[]>([]);
    const [future, setFuture] = useState<Snapshot[]>([]);
    const connectFrom = useRef<string | null>(null);
    const upload = useRef<HTMLInputElement>(null);
    const { screenToFlowPosition, fitView, getViewport } = useReactFlow();
    useEffect(() => {
        if (!pendingFocus.current || !nodesReady || !pendingFocus.current.every(id => nodes.some(node => node.id === id && node.measured?.width))) return;
        void fitView({ nodes: pendingFocus.current.map(id => ({ id })), padding: .4, maxZoom: 1, duration: 200 });
        pendingFocus.current = null;
    }, [nodesReady, nodes, fitView]);
    const navigate = useNavigate();
    const location = useLocation();
    const root = useRef<HTMLDivElement>(null);

    const snapshot = useCallback((): Snapshot => {
        const current = useStore.getState().canvases[canvasId];
        return structuredClone({ nodes: current?.nodes || [], edges: current?.edges || [] });
    }, [canvasId]);
    const checkpoint = useCallback(() => { setHistory(items => [...items.slice(-49), snapshot()]); setFuture([]); }, [snapshot]);
    const write = useCallback((next: Snapshot) => {
        useStore.setState(state => projectBoardPatch(state, canvasId, next));
    }, [canvasId]);
    const updateText = (id: string, label: string) => {
        const current = snapshot();
        write({ ...current, nodes: current.nodes.map(node => node.id === id ? { ...node, data: { ...node.data, label } } : node) });
    };
    const changeNodes = (changes: NodeChange[]) => {
        if (changes.some(change => change.type === 'remove')) checkpoint();
        const current = snapshot();
        const next = applyNodeChanges(changes, current.nodes);
        const ids = new Set(next.map(node => node.id));
        write({ nodes: next, edges: current.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)) });
    };
    const changeEdges = (changes: EdgeChange[]) => {
        if (changes.some(change => change.type === 'remove')) checkpoint();
        const current = snapshot(); write({ ...current, edges: applyEdgeChanges(changes, current.edges) });
    };
    const connect = (connection: Connection) => {
        const current = snapshot();
        const error = boardConnectionError(current, connection);
        if (error) { setHelp(error); return false; }
        checkpoint();
        write({ ...current, edges: addEdge({ ...connection, id: crypto.randomUUID(), type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#8591a6', strokeWidth: 2 } }, current.edges) });
        setHelp('Connection added. Choose another pair or press V.');
        return true;
    };
    const add = (kind: Tool, point?: { x: number; y: number }) => {
        const rect = root.current?.getBoundingClientRect();
        const requestedPosition = point || screenToFlowPosition({ x: (rect?.left || 0) + (rect?.width || 800) / 2 - 90, y: (rect?.top || 0) + (rect?.height || 600) / 2 - 75 });
        checkpoint(); const current = snapshot(); const id = crypto.randomUUID();
        const position = availableBoardPosition(current.nodes, requestedPosition);
        write({ ...current, nodes: [...current.nodes.map(node => ({ ...node, selected: false })), { id, type: 'brainstorm', position, style: { width: 200, height: 190 }, data: { kind, color, label: '' }, selected: true }] });
        setTool('select'); setEditingId(id);
        pendingFocus.current = [id];
    };
    const addChild = (parentId: string) => {
        const current = snapshot();
        const parent = current.nodes.find(node => node.id === parentId);
        if (!parent) return;
        checkpoint();
        const id = crypto.randomUUID();
        const width = Number(parent.measured?.width || parent.width || parent.style?.width) || 220;
        const position = availableBoardPosition(current.nodes, {x:parent.position.x+width+100,y:parent.position.y});
        write({nodes:[...current.nodes.map(node=>({...node,selected:false})),{id,type:'brainstorm',position,style:{width:220,height:190},selected:true,data:{kind:'sticky',label:'',color:parent.data.color||color,parentIdeaId:parentId}}],edges:[...current.edges,{id:crypto.randomUUID(),source:parentId,target:id,sourceHandle:'right',targetHandle:'left',type:'smoothstep',markerEnd:{type:MarkerType.ArrowClosed}}]});
        setTool('select'); setEditingId(id);
        pendingFocus.current = [parentId, id];
    };
    const undo = () => { if (!history.length) return; setFuture(items => [...items, snapshot()]); write(history[history.length - 1]); setHistory(items => items.slice(0, -1)); };
    const redo = () => { if (!future.length) return; setHistory(items => [...items, snapshot()]); write(future[future.length - 1]); setFuture(items => items.slice(0, -1)); };
    const remove = () => {
        checkpoint(); const current = snapshot(); const ids = new Set(current.nodes.filter(node => node.selected).map(node => node.id));
        write({ nodes: current.nodes.filter(node => !ids.has(node.id)), edges: current.edges.filter(edge => !edge.selected && !ids.has(edge.source) && !ids.has(edge.target)) });
    };
    const duplicate = () => {
        const current = snapshot(); const selected = current.nodes.filter(node => node.selected); if (!selected.length) return;
        checkpoint(); write(duplicateBoardSelection(current, () => crypto.randomUUID()));
    };
    const template = (name: string) => {
        checkpoint(); const current = snapshot(); const view = getViewport(); const origin = availableBoardPosition(current.nodes, { x: -view.x / view.zoom + 100, y: -view.y / view.zoom + 100 }, 750, 420);
        const labels = name === 'Brainstorm' ? ['The big question', 'What if...', 'What do we know?', 'What could we try?', 'Next experiment'] : name === 'Retrospective' ? ['What went well', 'What was difficult', 'What we learned', 'What to try next'] : ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
        const added: Node[] = labels.map((label, index) => ({ id: crypto.randomUUID(), type: 'brainstorm', position: { x: origin.x + (index % 3) * 260, y: origin.y + Math.floor(index / 3) * 230 }, data: { label, kind: 'sticky', color: COLORS[index % COLORS.length] }, style: { width: 210, height: 175 } }));
        write({ nodes: [...current.nodes, ...added], edges: [...current.edges, ...(name === 'Brainstorm' ? added.slice(1).map(node => ({ id: crypto.randomUUID(), source: added[0].id, target: node.id, sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } })) : [])] });
        setEditingId(null); setTool('select'); setTemplates(false); requestAnimationFrame(() => void fitView({ padding: 0.3, duration: 300 }));
    };
    const exportBoard = () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ name: project?.name, ...snapshot() }, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'brainstorm-board.json'; link.click(); URL.revokeObjectURL(url); };
    const selectedEdge = edges.find(edge => edge.selected);
    const editEdge = (patch: Partial<Edge>) => { const current = snapshot(); write({ ...current, edges: current.edges.map(edge => edge.id === selectedEdge?.id ? { ...edge, ...patch } : edge) }); };
    const selected = nodes.filter(node => node.selected);
    const tools = [{ id: 'select', icon: MousePointer2, label: 'Select (V)' }, { id: 'hand', icon: Hand, label: 'Pan (H)' }, { id: 'sticky', icon: StickyNote, label: 'Sticky note (N)' }, { id: 'text', icon: Type, label: 'Text (T)' }, { id: 'rectangle', icon: Square, label: 'Rectangle (R)' }, { id: 'circle', icon: Circle, label: 'Circle' }, { id: 'diamond', icon: Diamond, label: 'Decision' }, { id: 'connect', icon: ArrowUpRight, label: 'Connect (L)' }] as const;

    return <BoardHistoryContext.Provider value={checkpoint}><BoardEditingContext.Provider value={{ tool, editingId, edit: setEditingId, update: updateText, addChild, finish: id => setEditingId(current => current === id ? null : current) }}><div ref={root} className={`brainstorm-board tool-${tool} ${panBoard ? 'background-pan' : ''}`} tabIndex={0} aria-label="Brainstorming board" onKeyDown={event => {
        if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
        if (event.ctrlKey || event.metaKey) { if (event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } if (event.key.toLowerCase() === 'd') { event.preventDefault(); duplicate(); } return; }
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); return; }
        const shortcuts: Record<string, Tool> = { v: 'select', h: 'hand', n: 'sticky', t: 'text', r: 'rectangle', l: 'connect', Escape: 'select' };
        if (shortcuts[event.key]) { setEditingId(null); setTool(shortcuts[event.key]); connectFrom.current = null; }
    }}>
        <ReactFlow zoomOnDoubleClick={false} nodes={flowNodes} edges={edges} nodeTypes={NODE_TYPES} onNodesChange={changeNodes} onEdgesChange={changeEdges} onConnect={connect} connectionMode={ConnectionMode.Loose} edgesReconnectable onReconnectStart={checkpoint} onReconnect={(edge, connection) => { const current = snapshot(); const error = boardConnectionError(current, connection, edge.id); if (error) { setHelp(error); return; } write({ ...current, edges: reconnectEdge(edge, connection, current.edges) }); setHelp('Connection updated.'); }} onNodeDragStart={() => { setEditingId(null); checkpoint(); }} onPaneClick={event => { if (!['select', 'hand', 'connect'].includes(tool)) add(tool, screenToFlowPosition({ x: event.clientX, y: event.clientY })); }} onNodeClick={(_, node) => {
            if (tool !== 'connect') return;
            if (!connectFrom.current) { connectFrom.current = node.id; setHelp('Now click the idea to connect to.'); }
            else { if (connectFrom.current === node.id) { setHelp('Choose a different idea to connect to.'); return; } connect({ source: connectFrom.current, target: node.id, sourceHandle: 'right', targetHandle: 'left' }); connectFrom.current = null; }
        }} nodesDraggable={tool === 'select'} nodeDragThreshold={5} nodeClickDistance={5} elementsSelectable={tool !== 'hand'} selectionOnDrag={tool === 'select' && !panBoard} panOnDrag={tool === 'hand' || (tool === 'select' && panBoard) ? true : [1, 2]} deleteKeyCode={null} fitView fitViewOptions={{ padding: 0.3, maxZoom: 1 }} minZoom={0.15} maxZoom={3} defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#8591a6', strokeWidth: 2 } }} proOptions={{ hideAttribution: true }}>
            <Background gap={24} size={1} color="var(--board-dot)" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={node => String(node.data.color || COLORS[0])} />
        </ReactFlow>
        <div className="board-topline"><div><span className="board-eyebrow">THINK WITHOUT LIMITS</span><h2>{project?.name || project?.title || 'Project'} board <span>{nodes.length} ideas</span></h2></div><button aria-pressed={panBoard} onClick={() => setPanBoard(value => !value)} title="Drag empty background to move the board; turn off to draw a selection">{panBoard ? 'Move board' : 'Select area'}</button><button onClick={() => setTemplates(!templates)}><LayoutTemplate size={16} /><span>Templates</span></button><button onClick={exportBoard} title="Export board JSON" aria-label="Export board"><Download size={17} /></button></div>
        <div className="board-toolrail" aria-label="Board tools">{tools.map(({ id, icon: Icon, label }) => <button key={id} className={tool === id ? 'active' : ''} title={label} aria-label={label} aria-pressed={tool === id} onClick={() => { setEditingId(null); connectFrom.current = null; if (!['select', 'hand', 'connect'].includes(id)) { add(id); return; } setTool(id); setHelp(id === 'connect' ? 'Click a source idea, then a target. Or drag between the dots on any objects.' : ''); }}><Icon size={20} /></button>)}<span className="rail-divider" /><button title="Upload image" aria-label="Upload image" onClick={() => upload.current?.click()}><ImagePlus size={20} /></button><input ref={upload} type="file" accept="image/*" hidden onChange={event => {
            const file = event.target.files?.[0]; if (!file) return; if (file.size > 3 * 1024 * 1024) { setHelp('Choose an image under 3 MB.'); return; }
            if (!file.type.startsWith('image/')) { setHelp('Choose an image file.'); return; }
            const reader = new FileReader(); reader.onerror = () => setHelp('Could not read this image. Try another file.'); reader.onload = () => { checkpoint(); const current = snapshot(); const position = screenToFlowPosition({ x: (root.current?.getBoundingClientRect().left || 0) + 300, y: (root.current?.getBoundingClientRect().top || 0) + 180 }); write({ ...current, nodes: [...current.nodes, { id: crypto.randomUUID(), type: 'brainstormImage', position, data: { src: reader.result, label: file.name }, style: { width: 280, height: 200 } }] }); }; reader.readAsDataURL(file); event.target.value = '';
        }} /></div>
        <div className="board-palette" aria-label="Note colors">{COLORS.map(value => <button key={value} title={`Color ${value}`} aria-label={`Color ${value}`} aria-pressed={color === value} style={{ background: value }} className={color === value ? 'active' : ''} onClick={() => { setColor(value); if (selected.length) { checkpoint(); const current = snapshot(); write({ ...current, nodes: current.nodes.map(node => node.selected ? { ...node, data: { ...node.data, color: value } } : node) }); } }} />)}</div>
        {selected.length > 0 && <div className="board-selection"><span>{selected.length} selected</span><button title="Duplicate selected (Ctrl+D)" aria-label="Duplicate selected" onClick={duplicate}><Copy size={16} /></button><button title="Delete selected" aria-label="Delete selected" onClick={remove}><Trash2 size={16} /></button></div>}
        {selectedEdge && !selected.length && <div className="board-selection edge-properties"><input aria-label="Connection label" placeholder="Connection label" value={String(selectedEdge.label || '')} onFocus={checkpoint} onChange={event => editEdge({ label: event.target.value })} /><select aria-label="Connection style" value={selectedEdge.type || 'smoothstep'} onChange={event => { checkpoint(); editEdge({ type: event.target.value }); }}><option value="smoothstep">Elbow</option><option value="default">Curve</option><option value="straight">Straight</option></select><button aria-label="Delete connection" onClick={remove}><Trash2 size={15} /></button></div>}
        <div className="board-history"><button disabled={!history.length} onClick={undo} aria-label="Undo"><Undo2 size={17} /></button><button disabled={!future.length} onClick={redo} aria-label="Redo"><Redo2 size={17} /></button><span>{help || (tool === 'select' ? (panBoard ? 'Drag empty space to move the board / Drag a box to reposition it' : 'Drag empty space to select boxes / Right-drag to move the board') : tool === 'hand' ? 'Drag anywhere to explore your board' : tool === 'connect' ? 'Click two ideas to connect them' : 'Click anywhere to place your idea')}</span></div>
        {!nodes.length && <div className="board-welcome"><span className="board-welcome-icon"><StickyNote size={27} /></span><h3>A little space for your next big idea.</h3><p>Drop a note. Follow a thought. Connect the dots.</p><div><button onClick={() => add('sticky')}>Add your first note</button><button onClick={() => template('Brainstorm')}>Start with a template</button></div></div>}
        {templates && <div className="board-templates"><header><h3>A starting point for your thinking</h3><button aria-label="Close templates" onClick={() => setTemplates(false)}><X size={18} /></button></header>{['Brainstorm', 'Retrospective', 'SWOT'].map(name => <button key={name} onClick={() => template(name)}><LayoutTemplate size={20} /><span>{name}<small>{name === 'Brainstorm' ? 'Explore a question and its possibilities' : name === 'SWOT' ? 'Find strengths, risks, and opportunities' : 'Reflect, learn, and plan the next step'}</small></span><ArrowUpRight size={16} /></button>)}</div>}
        <button className="board-ai" onClick={() => navigate(`/ai/${canvasId}?prompt=${encodeURIComponent('Help me brainstorm this project. Review my board and writing, suggest new ideas, and identify useful connections.')}`, { state: location.state })}><Sparkles size={16} /><span>Brainstorm with AI</span></button>
    </div></BoardEditingContext.Provider></BoardHistoryContext.Provider>;
}
function BoardImage({ data, selected }: NodeProps) { const checkpoint = useContext(BoardHistoryContext); return <div className="board-image"><NodeResizer isVisible={selected} minWidth={100} minHeight={80} onResizeStart={checkpoint} /><Handle type="source" position={Position.Right} id="right" /><img src={String(data.src)} alt={String(data.label || 'Board image')} /><Handle type="source" position={Position.Left} id="left" /></div>; }
Object.assign(NODE_TYPES, { brainstormImage: BoardImage, image: BoardImage });
export default function BrainstormBoard(props: { canvasId: string }) { return <ReactFlowProvider><Board {...props} /></ReactFlowProvider>; }
