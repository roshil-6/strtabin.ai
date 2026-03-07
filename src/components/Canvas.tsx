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
    Panel,
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
import { Bot, FileText, Plus, Layers, Maximize, CheckSquare, Calendar, Layout, FolderOpen } from 'lucide-react';
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
    const { screenToFlowPosition, fitView } = useReactFlow();

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
    const handleAddNode = (type: 'default') => {
        const position = screenToFlowPosition({ x: window.innerWidth * 0.725, y: window.innerHeight / 2 });

        const newNode: Node = {
            id: `node-${Date.now()}`,
            type: type,
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

            {/* Content Container - Adjusted top padding for header and tabs */}
            <div className={`flex-1 flex w-full h-full ${isMerged ? 'pt-28' : 'pt-16'}`}>

                {/* Merged Tabs Bar - Fixed at the very top for browser-like feel */}
                {isMerged && currentCanvas.mergedCanvasIds && (
                    <div className="absolute top-0 left-0 right-0 h-14 bg-[#080808] border-b border-white/10 flex items-center px-4 gap-1 z-[60] shadow-2xl">
                        {/* Master Workflow Tab */}
                        <button
                            onClick={() => setActiveSubCanvasId(null)}
                            className={`
                                flex items-center gap-2.5 px-4 h-10 rounded-xl transition-all border
                                ${activeSubCanvasId === null
                                    ? 'bg-white/10 border-white/20 text-primary shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/60'
                                }
                            `}
                        >
                            <Layers size={16} />
                            <span className="text-sm font-black uppercase tracking-widest">Main Overview</span>
                        </button>

                        <div className="w-px h-6 bg-white/5 mx-2" />

                        {currentCanvas.mergedCanvasIds.map((subId: string) => {
                            const subCanvas = canvases[subId];
                            const isActive = activeSubCanvasId === subId;
                            return (
                                <button
                                    key={subId}
                                    onClick={() => setActiveSubCanvasId(subId)}
                                    className={`
                                        flex items-center gap-2.5 px-4 h-10 rounded-xl transition-all border
                                        ${isActive
                                            ? 'bg-white/10 border-white/20 text-primary shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                            : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/60'
                                        }
                                    `}
                                >
                                    <FileText size={16} />
                                    <span className="text-sm font-bold truncate max-w-[150px]">{subCanvas?.name || 'Sub Project'}</span>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => {
                                const newId = addSubCanvasToMerged(activeCanvasId);
                                setActiveSubCanvasId(newId);
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-dashed border-white/20 text-white/40 hover:bg-white/10 hover:border-white/40 hover:text-white transition-all ml-1"
                            title="Add New Sequence"
                        >
                            <Plus size={18} />
                        </button>
                        <div className="flex-1" />
                        <div className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] uppercase font-black tracking-widest text-orange-400">
                            Merged Project View
                        </div>
                    </div>
                )}

                {/* Writing Section (Mobile: Toggleable, Desktop: 45%) */}
                <div className={`
                ${mobileTab === 'write' ? 'flex' : 'hidden'} 
                md:flex w-full md:w-[45%] h-full border-r border-white/5 relative z-10 bg-background shadow-2xl
            `}>
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
                            // On mobile, switch to map to see the result
                            setMobileTab('map');
                        }}
                    />
                </div>

                {/* Visual Canvas (Mobile: Toggleable, Desktop: Flex-1) */}
                <div className={`
                ${mobileTab === 'map' ? 'flex' : 'hidden'} 
                md:flex flex-1 h-full relative flex-col
            `}>
                    {/* touch-action:none lets React Flow own all touch events (pinch zoom, drag pan)
                        without the browser intercepting them to zoom the page */}
                    <div className="flex-1 w-full h-full relative" style={{ touchAction: 'none' }}>
                        {/* Flow Top Bar */}
                        <div className={`absolute ${isMerged ? 'top-18' : 'top-4'} left-4 right-4 h-14 bg-[#1a1a1a]/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center px-4 z-40 justify-between transition-all`}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-bold text-white/70">Flow Canvas</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Only show Map Folder button when canvas is in a folder */}
                                {canvases[activeCanvasId]?.folderId && (
                                    <button
                                        onClick={handleAutoMapFolder}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                                        aria-label="Auto-map folder projects"
                                        title="Add boxes for all other projects in this folder"
                                    >
                                        <FolderOpen size={16} />
                                        <span className="text-xs font-bold hidden sm:inline">Map Folder</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/strab/${id || 'default'}`)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                                    aria-label="Open STRAB AI"
                                >
                                    <Bot size={16} />
                                    <span className="text-xs font-bold">Ask STRAB</span>
                                </button>
                            </div>
                        </div>

                        {/* On mobile: only mount ReactFlow when the map tab is active.
                            This prevents React Flow's global keydown handlers (Space = pan)
                            from intercepting key events in the Write section's inputs. */}
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
                            fitViewOptions={{ minZoom: 0.3, maxZoom: 1.5, padding: 0.15 }}
                            colorMode="dark"
                            minZoom={0.2}
                            maxZoom={2}
                            connectionRadius={50}
                            snapToGrid
                            snapGrid={[10, 10]}
                            connectionLineStyle={{ stroke: '#FF5F1F', strokeWidth: 2.5, strokeDasharray: '6 3' }}
                            // Bound the canvas — prevents infinite scroll in any direction
                            translateExtent={[[-4000, -4000], [4000, 4000]]}
                            // Touch behaviour: pinch-to-zoom nodes, single-finger drag to pan
                            // zoomOnScroll false on mobile (use pinch only); true on desktop
                            zoomOnPinch={true}
                            zoomOnScroll={!isMobile}
                            panOnScroll={false}
                            panOnDrag={true}
                            // preventScrolling true = stops body from scrolling when pointer is over canvas
                            preventScrolling={true}
                        >
                            <Background color="#151515" gap={20} variant={BackgroundVariant.Dots} size={1} />
                            <Controls style={{
                                backgroundColor: '#151515',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fill: '#9aa0a6',
                                marginBottom: '100px' // Space for expanded bottom nav on mobile
                            }} />

                            {/* Mobile-only Fit View Button */}
                            <Panel position="bottom-right" className="md:hidden pb-24 pr-4">
                                <button
                                    onClick={() => fitView({ duration: 600, padding: 0.2 })}
                                    className="w-12 h-12 rounded-full bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 active:scale-95 transition-all shadow-xl"
                                    title="Fit View"
                                    aria-label="Fit all nodes in view"
                                >
                                    <Maximize size={20} />
                                </button>
                            </Panel>
                        </ReactFlow>}
                    </div>

                    {/* Floating Command Dock */}
                    <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <CommandDock onAddNode={handleAddNode} />
                    </div>
                </div>

                {/* Mobile Bottom Navigation - Expanded for all sections */}
                <div className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-[#0b0b0b] border-t border-white/10 flex items-center justify-between z-50 px-2 pb-safe">
                    <button
                        onClick={() => setMobileTab('write')}
                        className={`flex flex-col items-center justify-center gap-1 w-14 ${mobileTab === 'write' ? 'text-primary' : 'text-white/40'}`}
                    >
                        <FileText size={18} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Write</span>
                    </button>

                    <button
                        onClick={() => setMobileTab('map')}
                        className={`flex flex-col items-center justify-center gap-1 w-14 ${mobileTab === 'map' ? 'text-primary' : 'text-white/40'}`}
                    >
                        <Layers size={18} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Flow</span>
                    </button>

                    <button
                        onClick={() => navigate(`/todo/${id || 'default'}`)}
                        className="flex flex-col items-center justify-center gap-1 w-14 text-white/40"
                    >
                        <CheckSquare size={18} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Tasks</span>
                    </button>

                    <button
                        onClick={() => navigate(`/timeline/${id || 'default'}`)}
                        className="flex flex-col items-center justify-center gap-1 w-14 text-white/40"
                    >
                        <Calendar size={18} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">TLine</span>
                    </button>

                    <button
                        onClick={() => navigate(`/strab/${id || 'default'}`)}
                        className="flex flex-col items-center justify-center gap-1 w-14 text-orange-400"
                    >
                        <Bot size={18} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">AI</span>
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="flex flex-col items-center justify-center gap-1 w-14 text-white/40"
                    >
                        <Layout size={18} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
                    </button>
                </div>
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
