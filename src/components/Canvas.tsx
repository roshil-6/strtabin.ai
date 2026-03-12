import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    BackgroundVariant,
    type Node,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useStore, { type RFState } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import TextNode from './nodes/TextNode';
import ImageNode from './nodes/ImageNode';
import SubProjectNode from './nodes/SubProjectNode';
import { IdeaNode, QuestionNode, DecisionNode } from './nodes/ThinkingNodes';
import SmartEdge from './edges/SmartEdge';
import CommandDock from './CommandDock';
// import TimelineMode from './TimelineMode'; // Unused
import { Bot, FileText, Plus, Layers, Maximize, CheckSquare, Calendar, Layout, FolderOpen, ZoomIn, ZoomOut, Move } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import WritingSection from './WritingSection';


function CanvasContent() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        addNode, setCurrentCanvas, initDefaultCanvas, canvases,
        addSubCanvasToMerged, syncSubProjectNodes, ensureCanvasExists
    } = useStore(useShallow((state: RFState) => ({
        nodes: state.nodes,
        edges: state.edges,
        onNodesChange: state.onNodesChange,
        onEdgesChange: state.onEdgesChange,
        onConnect: state.onConnect,
        addNode: state.addNode,
        setCurrentCanvas: state.setCurrentCanvas,
        initDefaultCanvas: state.initDefaultCanvas,
        canvases: state.canvases,
        addSubCanvasToMerged: state.addSubCanvasToMerged,
        syncSubProjectNodes: state.syncSubProjectNodes,
        ensureCanvasExists: state.ensureCanvasExists,
    })));
    const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();

    const nodeTypes = useMemo(() => ({
        text: TextNode,
        image: ImageNode,
        subproject: SubProjectNode,
        default: IdeaNode,
        question: QuestionNode,
        decision: DecisionNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        smart: SmartEdge,
    }), []);

    useEffect(() => {
        if (id) {
            ensureCanvasExists(id);
            setCurrentCanvas(id);
        } else {
            initDefaultCanvas();
            setCurrentCanvas('default');
        }
    }, [id, setCurrentCanvas, initDefaultCanvas, ensureCanvasExists]);

    // Update page title
    useEffect(() => {
        const name = canvases[id || '']?.name;
        document.title = name ? `${name} | Stratabin` : 'Stratabin AI — Strategy Workspace';
    }, [id, canvases]);

    // Ensure we have a valid canvas ID for operations
    const activeCanvasId = id || 'default';

    const currentCanvas = canvases[activeCanvasId];
    const isMerged = !!currentCanvas?.mergedCanvasIds;
    const [activeSubCanvasId, setActiveSubCanvasId] = useState<string | null>(null);

    useEffect(() => {
        if (isMerged && id) {
            syncSubProjectNodes(id);
        }
    }, [isMerged, id, syncSubProjectNodes]);

    useEffect(() => {
        if (isMerged && activeSubCanvasId) {
            setCurrentCanvas(activeSubCanvasId);
        } else if (id) {
            setCurrentCanvas(id);
        }
    }, [activeSubCanvasId, id, setCurrentCanvas, isMerged]);

    // Enhanced Nodes with Actions
    const enhancedNodes = useMemo(() => {
        return nodes.map(node => {
            if (node.type === 'subproject') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        onViewWorkflow: () => {
                            // Folder-mapped nodes navigate directly to the project
                            if (node.data.navigateTo) {
                                navigate(node.data.navigateTo as string);
                            } else if (node.data.linkedSubCanvasId) {
                                setActiveSubCanvasId(node.data.linkedSubCanvasId as string);
                            }
                        }
                    }
                };
            }
            return node;
        });
    }, [nodes, navigate]);

    // Handle Adding Nodes from Command Dock
    const handleAddNode = (type: 'default' | 'text' | 'question' | 'decision') => {
        const position = screenToFlowPosition({ x: window.innerWidth * 0.725, y: window.innerHeight / 2 });
        const newNode: Node = {
            id: `node-${Date.now()}`,
            type,
            position: { x: position.x - 100, y: position.y - 50 },
            data: { label: '' },
        };
        addNode(newNode);
    };

    // Selector needs to be updated to include createCanvas and updateNodeData
    // ... (Use a more complete selector or individual hooks if needed, but for now assuming selector provides these)

    // Auto-populate the canvas with subproject nodes for every other canvas in the same folder
    const handleAutoMapFolder = useCallback(() => {
        const canvas = canvases[activeCanvasId];
        if (!canvas?.folderId) {
            toast.error('This project is not in a folder. Move it to a folder first.');
            return;
        }

        const siblings = Object.values(canvases).filter(
            c => c.folderId === canvas.folderId && c.id !== activeCanvasId
        );

        if (siblings.length === 0) {
            toast.error('No other projects found in this folder.');
            return;
        }

        // Skip canvases that are already represented as subproject nodes
        const existingLinkedIds = new Set(
            nodes
                .filter(n => n.type === 'subproject')
                .map(n => n.data.linkedSubCanvasId as string)
                .filter(Boolean)
        );

        const newSiblings = siblings.filter(s => !existingLinkedIds.has(s.id));

        if (newSiblings.length === 0) {
            toast.success('All folder projects are already on this canvas.');
            return;
        }

        const COLS = 3;
        const NODE_W = 300;
        const NODE_H = 160;
        const GAP_X = 60;
        const GAP_Y = 60;

        // Place nodes to the right of any existing nodes, or centred at origin
        const baseX = nodes.length > 0
            ? Math.max(...nodes.map(n => n.position.x + (n.measured?.width ?? NODE_W))) + 80
            : -(Math.min(newSiblings.length, COLS) * (NODE_W + GAP_X)) / 2;
        const baseY = nodes.length > 0
            ? Math.min(...nodes.map(n => n.position.y))
            : -(Math.ceil(newSiblings.length / COLS) * (NODE_H + GAP_Y)) / 2;

        newSiblings.forEach((sibling, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            addNode({
                id: `folder-node-${sibling.id}`,
                type: 'subproject',
                position: {
                    x: baseX + col * (NODE_W + GAP_X),
                    y: baseY + row * (NODE_H + GAP_Y),
                },
                data: {
                    label: sibling.name || 'Untitled Project',
                    linkedSubCanvasId: sibling.id,
                    navigateTo: `/strategy/${sibling.id}`,
                },
            });
        });

        setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 80);
        toast.success(`Mapped ${newSiblings.length} project${newSiblings.length !== 1 ? 's' : ''} from folder`);
    }, [activeCanvasId, canvases, nodes, addNode, fitView]);

    const onNodeDoubleClick = useCallback(() => {
        // Double click navigation disabled
    }, []);

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        if (event.detail === 2) {
            const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const newNode: Node = {
                id: `node-${Date.now()}`,
                type: 'text',
                position: flowPos,
                data: { label: '' },
            };
            addNode(newNode);
        }
    }, [addNode, screenToFlowPosition]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                const file = event.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imageUrl = e.target?.result as string;
                        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
                        const newNode: Node = {
                            id: `img-${Date.now()}`,
                            type: 'image',
                            position,
                            data: { imgUrl: imageUrl, label: file.name },
                        };
                        addNode(newNode);
                    };
                    reader.onerror = () => {
                        import('react-hot-toast').then(({ default: toast }) => {
                            toast.error('Failed to read image file. Please try again.');
                        });
                    };
                    reader.readAsDataURL(file);
                }
            }
        },
        [addNode, screenToFlowPosition]
    );



    const [mobileTab, setMobileTab] = useState<'write' | 'map'>('write');
    // Track mobile state so we can conditionally unmount ReactFlow when not in map tab
    // (prevents React Flow's global keydown handlers from intercepting Space in inputs)
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler, { passive: true });
        return () => window.removeEventListener('resize', handler);
    }, []);

    return (
        <div className="w-screen h-screen bg-background text-white relative overflow-hidden flex flex-col md:flex-row">

            {/* Desktop Sidebar */}
            <div className={`hidden md:block h-full ${isMerged ? 'pt-12' : ''}`}>
                <Sidebar canvasId={id || 'default'} />
            </div>

            {/* Content Container
                On mobile: height stops at the bottom nav (80px) so nothing is ever hidden behind it.
                On desktop: full height as before. */}
            <div
                className={`flex-1 flex w-full ${isMerged ? 'pt-12 md:pt-14' : ''}`}
                style={{ height: isMobile ? 'calc(100% - 80px)' : '100%' }}
            >

                {/* Merged Tabs Bar */}
                {isMerged && currentCanvas.mergedCanvasIds && (
                    <div className="absolute top-0 left-0 right-0 h-12 md:h-14 bg-[#060606]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-2 md:px-4 gap-1 z-[60] shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-x-auto custom-scrollbar-hide">
                        <button
                            onClick={() => setActiveSubCanvasId(null)}
                            className={`
                                flex items-center gap-1.5 md:gap-2.5 px-2.5 md:px-4 h-8 md:h-10 rounded-xl transition-all border shrink-0
                                ${activeSubCanvasId === null
                                    ? 'bg-white/10 border-white/15 text-primary shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                                    : 'bg-white/[0.03] border-transparent text-white/40 hover:bg-white/10 hover:text-white/60'
                                }
                            `}
                        >
                            <Layers size={14} />
                            <span className="text-[11px] md:text-sm font-black uppercase tracking-wider">Overview</span>
                        </button>

                        <div className="w-px h-5 md:h-6 bg-white/5 mx-1 md:mx-2 shrink-0" />

                        {currentCanvas.mergedCanvasIds.map((subId: string) => {
                            const subCanvas = canvases[subId];
                            const isActive = activeSubCanvasId === subId;
                            return (
                                <button
                                    key={subId}
                                    onClick={() => setActiveSubCanvasId(subId)}
                                    className={`
                                        flex items-center gap-1.5 md:gap-2.5 px-2.5 md:px-4 h-8 md:h-10 rounded-xl transition-all border shrink-0
                                        ${isActive
                                            ? 'bg-white/10 border-white/15 text-primary shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                                            : 'bg-white/[0.03] border-transparent text-white/40 hover:bg-white/10 hover:text-white/60'
                                        }
                                    `}
                                >
                                    <FileText size={13} />
                                    <span className="text-[11px] md:text-sm font-bold truncate max-w-[100px] md:max-w-[150px]">{subCanvas?.name || 'Sub Project'}</span>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => {
                                const newId = addSubCanvasToMerged(activeCanvasId);
                                setActiveSubCanvasId(newId);
                            }}
                            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-white/40 hover:bg-white/10 hover:border-white/40 hover:text-white active:scale-95 transition-all ml-1 shrink-0"
                            title="Add New Sequence"
                        >
                            <Plus size={16} />
                        </button>
                        <div className="flex-1" />
                        <div className="hidden md:block px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] uppercase font-black tracking-widest text-orange-400 shrink-0">
                            Merged Project View
                        </div>
                    </div>
                )}

                {/* Writing Section (Mobile: Toggleable, Desktop: 45%) — isolated from flow zoom/scroll */}
                <div
                    className={`
                        ${mobileTab === 'write' ? 'flex' : 'hidden'} 
                        md:flex w-full md:w-[45%] h-full border-r border-white/5 relative z-10 bg-background shadow-2xl
                    `}
                    style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
                    onWheel={(e) => e.stopPropagation()}
                >
                    <WritingSection
                        canvasId={id || 'default'}
                        onBranch={() => {
                            if (nodes.length === 0) {
                                const flowPos = screenToFlowPosition({ x: window.innerWidth * 0.725, y: window.innerHeight / 2 });
                                addNode({
                                    id: `root-${Date.now()}`,
                                    type: 'text',
                                    position: flowPos,
                                    data: { label: '' }
                                });
                            }
                            setMobileTab('map');
                        }}
                    />
                </div>

                {/* Visual Canvas (Mobile: Toggleable, Desktop: Flex-1) — fully isolated zoom/pan */}
                <div
                    className={`
                        ${mobileTab === 'map' ? 'flex' : 'hidden'} 
                        md:flex flex-1 h-full relative flex-col
                    `}
                    style={{ overscrollBehavior: 'contain' }}
                    onWheel={(e) => e.stopPropagation()}
                >
                    <div className="flex-1 w-full h-full relative" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
                        {/* Flow Top Bar — compact on mobile */}
                        <div className={`absolute ${isMerged ? 'top-[4.5rem]' : 'top-1.5 md:top-4'} left-1.5 right-1.5 md:left-4 md:right-4 h-10 md:h-14 bg-[#0e0e0e]/90 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/[0.06] flex items-center px-2 md:px-4 z-40 justify-between transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]`}>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                                <span className="text-[10px] md:text-sm font-bold text-white/50">Flow</span>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                {canvases[activeCanvasId]?.folderId && (
                                    <button
                                        onClick={handleAutoMapFolder}
                                        className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                                        aria-label="Auto-map folder projects"
                                    >
                                        <FolderOpen size={13} />
                                        <span className="text-[10px] font-bold hidden sm:inline">Map Folder</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/strab/${id || 'default'}`)}
                                    className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 active:scale-95 transition-all"
                                    aria-label="Open STRAB AI"
                                >
                                    <Bot size={13} />
                                    <span className="text-[10px] md:text-[11px] font-bold">AI</span>
                                </button>
                            </div>
                        </div>

                        {(!isMobile || mobileTab === 'map') && <ReactFlow
                            nodes={enhancedNodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onPaneClick={onPaneClick}
                            onNodeDoubleClick={onNodeDoubleClick}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
                            fitView
                            fitViewOptions={{ minZoom: 0.3, maxZoom: 1.5, padding: 0.2 }}
                            colorMode="dark"
                            minZoom={0.1}
                            maxZoom={2.5}
                            connectionRadius={50}
                            snapToGrid
                            snapGrid={[10, 10]}
                            connectionLineStyle={{ stroke: '#FF5F1F', strokeWidth: 2.5, strokeDasharray: '6 3' }}
                            translateExtent={isMobile ? undefined : [[-4000, -4000], [4000, 4000]]}
                            zoomOnPinch={true}
                            zoomOnScroll={!isMobile}
                            panOnScroll={false}
                            panOnDrag={true}
                            preventScrolling={true}
                            panActivationKeyCode={null}
                            disableKeyboardA11y={isMobile}
                            selectionOnDrag={false}
                        >
                            <Background color="#151515" gap={20} variant={BackgroundVariant.Dots} size={1} />

                            {/* Desktop-only: built-in controls */}
                            <div className="hidden md:block">
                                <Controls style={{
                                    backgroundColor: '#151515',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fill: '#9aa0a6',
                                    marginBottom: '60px',
                                }} />
                            </div>
                        </ReactFlow>}

                        {/* Mobile floating toolbar — replaces confusing default controls */}
                        {isMobile && mobileTab === 'map' && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-[#0e0e0e]/95 backdrop-blur-2xl px-2 py-1.5 rounded-2xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                                <button
                                    onClick={() => handleAddNode('default')}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 active:scale-90 transition-all"
                                    aria-label="Add new section"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    <span className="text-[10px] font-black tracking-wide">Add</span>
                                </button>

                                <div className="w-px h-6 bg-white/[0.06]" />

                                <button
                                    onClick={() => fitView({ duration: 400, padding: 0.25 })}
                                    className="p-2.5 rounded-xl text-white/50 active:scale-90 active:bg-white/10 transition-all"
                                    aria-label="Fit all nodes in view"
                                >
                                    <Maximize size={17} />
                                </button>

                                <button
                                    onClick={() => zoomIn({ duration: 200 })}
                                    className="p-2.5 rounded-xl text-white/50 active:scale-90 active:bg-white/10 transition-all"
                                    aria-label="Zoom in"
                                >
                                    <ZoomIn size={17} />
                                </button>

                                <button
                                    onClick={() => zoomOut({ duration: 200 })}
                                    className="p-2.5 rounded-xl text-white/50 active:scale-90 active:bg-white/10 transition-all"
                                    aria-label="Zoom out"
                                >
                                    <ZoomOut size={17} />
                                </button>

                                <div className="w-px h-6 bg-white/[0.06]" />

                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03]">
                                    <Move size={11} className="text-white/20" />
                                    <span className="text-[8px] font-bold text-white/20 tracking-wider">DRAG TO PAN</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Floating Command Dock — desktop only now, mobile uses the toolbar above */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 hidden md:block">
                        <CommandDock onAddNode={handleAddNode} />
                    </div>
                </div>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060606]/[0.97] backdrop-blur-2xl border-t border-white/[0.04]" aria-label="Canvas navigation">
                    <div className="flex items-stretch h-[62px] px-1">
                        {[
                            { label: 'Write', icon: FileText, action: () => setMobileTab('write'),            active: mobileTab === 'write' },
                            { label: 'Flow',  icon: Layers,   action: () => setMobileTab('map'),              active: mobileTab === 'map'   },
                            { label: 'Tasks', icon: CheckSquare, action: () => navigate(`/todo/${id || 'default'}`),     active: false },
                            { label: 'Cal',   icon: Calendar, action: () => navigate(`/calendar/${id || 'default'}`),   active: false },
                            { label: 'AI',    icon: Bot,      action: () => navigate(`/strab/${id || 'default'}`),      active: false, highlight: true },
                            { label: 'Home',  icon: Layout,   action: () => navigate('/dashboard'),                     active: false },
                        ].map(({ label, icon: Icon, action, active, highlight }) => (
                            <button
                                key={label}
                                onClick={action}
                                className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 relative active:scale-90 transition-all duration-200"
                                aria-label={label}
                            >
                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full transition-all duration-300 ${active ? 'w-8 h-[2.5px] bg-primary shadow-[0_0_8px_rgba(255,95,31,0.4)]' : 'w-0 h-0'}`} />
                                <div className={`rounded-xl p-1.5 transition-all duration-200 ${active ? 'bg-white/[0.08]' : ''}`}>
                                    <Icon
                                        size={19}
                                        strokeWidth={active ? 2.4 : 1.5}
                                        className={`transition-colors duration-200 ${active ? 'text-white' : highlight ? 'text-primary/70' : 'text-white/25'}`}
                                    />
                                </div>
                                <span className={`text-[9px] font-bold tracking-wider leading-none transition-colors duration-200 ${active ? 'text-white/90' : highlight ? 'text-primary/50' : 'text-white/20'}`}>
                                    {label}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} className="bg-[#060606]/[0.97]" />
                </nav>
            </div>
        </div>
    );
}

export default function Canvas() {
    return (
        <ReactFlowProvider>
            <CanvasContent />
        </ReactFlowProvider>
    );
}
