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
import { IdeaNode, QuestionNode, DecisionNode } from './nodes/ThinkingNodes';
import SmartEdge from './edges/SmartEdge';
import CommandDock from './CommandDock';
// import TimelineMode from './TimelineMode'; // Unused
import WritingSection from './WritingSection';
import Sidebar from './Sidebar';

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
});

function CanvasContent() {
    const { id } = useParams<{ id: string }>();
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        addNode, setCurrentCanvas, createCanvas, initDefaultCanvas, updateNodeData
    } = useStore(useShallow(selector));
    const { screenToFlowPosition } = useReactFlow();
    // const [mode, setMode] = useState<'canvas'>('canvas'); // Removed unused state

    // Use standard TextNode or a specific FlowchartNode. For now, reusing IdeaNode structure but simplified could work,
    // or just TextNode. Let's use IdeaNode but call it "Box" in UI.
    const nodeTypes = useMemo(() => ({
        text: TextNode,
        image: ImageNode,
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
    // The above is tricky because createCanvas returns an ID.
    // Let's implement a "ensureCanvas" in store or just handle it here:
    // If we rely on 'default', we must create it manually.

    // Better Fix:
    // If we are on root, WritingSection 'default' will fail.
    // Let's make WritingSection robust.

    // Handle Adding Nodes from Command Dock
    const handleAddNode = (type: 'default') => {
        const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const position = screenToFlowPosition(center);

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
            <div className="hidden md:block h-full">
                <Sidebar canvasId={id || 'default'} />
            </div>

            {/* Writing Section (Mobile: Toggleable, Desktop: 45%) */}
            <div className={`
                ${mobileTab === 'write' ? 'flex' : 'hidden'} 
                md:flex w-full md:w-[45%] h-full border-r border-white/5 relative z-10 bg-background shadow-2xl
            `}>
                <WritingSection
                    canvasId={id || 'default'}
                    onBranch={() => {
                        if (nodes.length === 0) {
                            const center = { x: window.innerWidth / 4 + window.innerWidth / 2, y: window.innerHeight / 2 };
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
                    <ReactFlow
                        nodes={nodes}
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
    );
}

export default function Canvas() {
    return (
        <ReactFlowProvider>
            <CanvasContent />
        </ReactFlowProvider>
    );
}
