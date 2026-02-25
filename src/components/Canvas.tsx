import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { Bot, FileText, Plus, Layers } from 'lucide-react';
import Sidebar from './Sidebar';
import WritingSection from './WritingSection';

const selector = (state: RFState) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    addNode: state.addNode,
    setCurrentCanvas: state.setCurrentCanvas,
    createCanvas: state.createCanvas,
    initDefaultCanvas: state.initDefaultCanvas,
    updateNodeData: state.updateNodeData,
    canvases: state.canvases,
    currentCanvasId: state.currentCanvasId,
    addSubCanvasToMerged: state.addSubCanvasToMerged,
    syncSubProjectNodes: state.syncSubProjectNodes,
});

function CanvasContent() {
    const { id } = useParams<{ id: string }>();
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        addNode, setCurrentCanvas, initDefaultCanvas, canvases,
        addSubCanvasToMerged, syncSubProjectNodes
    } = useStore(useShallow(selector));
    const { screenToFlowPosition } = useReactFlow();
    // const [mode, setMode] = useState<'canvas'>('canvas'); // Removed unused state

    // Use standard TextNode or a specific FlowchartNode. For now, reusing IdeaNode structure but simplified could work,
    // or just TextNode. Let's use IdeaNode but call it "Box" in UI.
    const nodeTypes = useMemo(() => ({
        text: TextNode,
        image: ImageNode,
        subproject: SubProjectNode,
        default: IdeaNode, // Reusing the styled node for generic boxes
        question: QuestionNode,
        decision: DecisionNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        smart: SmartEdge,
    }), []);

    useEffect(() => {
        if (id) {
            setCurrentCanvas(id);
        } else {
            // Initialize default canvas if we are on the root route
            initDefaultCanvas();
            setCurrentCanvas('default');
        }
    }, [id, setCurrentCanvas, initDefaultCanvas]);

    // Ensure we have a valid canvas ID for operations
    const activeCanvasId = id || 'default';

    // Quick fix: If activeCanvasId is 'default', ensure it exists in store
    useEffect(() => {
        const state = useStore.getState();
        if (!state.canvases[activeCanvasId]) {
            state.createCanvas(); // This creates a random ID, doesn't help 'default'
            // We need a way to force-create or just use the first available?
        }
    }, [activeCanvasId]);

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
                            if (node.data.linkedSubCanvasId) {
                                setActiveSubCanvasId(node.data.linkedSubCanvasId);
                            }
                        }
                    }
                };
            }
            return node;
        });
    }, [nodes]);

    // Handle Adding Nodes from Command Dock
    const handleAddNode = () => {
        const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

        const newNode: Node = {
            id: `node-${Date.now()}`,
            type: 'default',
            position: { x: position.x - 100, y: position.y - 50 },
            data: { label: 'New Step' }, // Generic label
        };
        addNode(newNode);
    };

    // Selector needs to be updated to include createCanvas and updateNodeData
    // ... (Use a more complete selector or individual hooks if needed, but for now assuming selector provides these)

    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, _node: Node) => {
        // Double click navigation disabled
    }, []);

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        if (event.detail === 2) {
            const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const newNode: Node = {
                id: `node-${Date.now()}`,
                type: 'default',
                position: flowPos,
                data: { label: 'New Step' },
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
                    reader.readAsDataURL(file);
                }
            }
        },
        [addNode, screenToFlowPosition]
    );



    const [mobileTab, setMobileTab] = useState<'write' | 'map'>('write');

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
                                    ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(218,119,86,0.1)]'
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
                                            ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(218,119,86,0.1)]'
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
                                const flowPos = screenToFlowPosition({ x: window.innerWidth * 0.75, y: window.innerHeight / 2 });
                                addNode({
                                    id: `root-${Date.now()}`,
                                    type: 'default',
                                    position: flowPos,
                                    data: { label: 'Core Concept' }
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
                    <div className="flex-1 w-full h-full relative">
                        {/* Flow Top Bar - Lowered when tabs are present */}
                        <div className={`absolute ${isMerged ? 'top-18' : 'top-4'} left-4 right-4 h-14 bg-[#1a1a1a]/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center px-4 z-40 justify-between transition-all`}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-bold text-white/70">Flow Canvas</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.location.href = `/strab/${id || 'default'}`}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                                >
                                    <Bot size={16} />
                                    <span className="text-xs font-bold">Ask STRAB</span>
                                </button>
                            </div>
                        </div>

                        <ReactFlow
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
                            fitViewOptions={{ minZoom: 0.5, maxZoom: 1.5, padding: 0.2 }}
                            colorMode="dark"
                            minZoom={0.2}
                            connectionRadius={50}
                            snapToGrid
                            snapGrid={[10, 10]}
                            connectionLineStyle={{ stroke: '#FF5F1F', strokeWidth: 2.5, strokeDasharray: '6 3' }}
                        >
                            <Background color="#151515" gap={20} variant={BackgroundVariant.Dots} size={1} />
                            <Controls style={{
                                backgroundColor: '#151515',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fill: '#9aa0a6',
                                marginBottom: '60px' // Space for bottom nav on mobile
                            }} />
                        </ReactFlow>
                    </div>

                    {/* Floating Command Dock */}
                    <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <CommandDock onAddNode={handleAddNode} />
                    </div>
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#0b0b0b] border-t border-white/10 flex items-center justify-around z-50 pb-safe">
                    <button
                        onClick={() => setMobileTab('write')}
                        className={`flex flex-col items-center gap-1 p-2 ${mobileTab === 'write' ? 'text-primary' : 'text-white/40'}`}
                    >
                        <span className="text-xs font-bold uppercase tracking-widest">Write</span>
                        <div className={`w-1 h-1 rounded-full ${mobileTab === 'write' ? 'bg-primary' : 'bg-transparent'}`} />
                    </button>

                    <div className="w-px h-8 bg-white/5" />

                    <button
                        onClick={() => {
                            // Saving logic could go here
                            window.location.href = '/';
                        }}
                        className="flex flex-col items-center gap-1 p-2 text-white/40"
                    >
                        <span className="text-xs font-bold uppercase tracking-widest">Home</span>
                        <div className="w-1 h-1 rounded-full bg-transparent" />
                    </button>

                    <div className="w-px h-8 bg-white/5" />

                    <button
                        onClick={() => setMobileTab('map')}
                        className={`flex flex-col items-center gap-1 p-2 ${mobileTab === 'map' ? 'text-primary' : 'text-white/40'}`}
                    >
                        <span className="text-xs font-bold uppercase tracking-widest">Flow</span>
                        <div className={`w-1 h-1 rounded-full ${mobileTab === 'map' ? 'bg-primary' : 'bg-transparent'}`} />
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
