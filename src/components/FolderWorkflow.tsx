import { useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    BackgroundVariant,
    type Node,
    type NodeChange,
    type EdgeChange,
    type Connection,
    ReactFlowProvider,
    Panel,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useStore from '../store/useStore';
import { ArrowLeft, Plus, FolderOpen, LayoutGrid, HelpCircle } from 'lucide-react';
import WorkflowStepNode from './nodes/WorkflowStepNode';
import SmartEdge from './edges/SmartEdge';
import toast from 'react-hot-toast';

const NODE_W = 200;
const NODE_H = 120;
const GAP_X = 80;
const GAP_Y = 60;

function WorkflowContent() {
    const navigate = useNavigate();
    const { folderId } = useParams<{ folderId: string }>();
    const store = useStore();
    const { fitView } = useReactFlow();

    const targetFolderId = folderId === 'general' ? null : folderId;
    const actualFolderIdStr = folderId || 'general';

    const folderDetails = useMemo(() => {
        if (!targetFolderId) return { name: 'General Projects', id: 'general' };
        return store.folders[targetFolderId] || { name: 'Unknown Folder', id: targetFolderId };
    }, [targetFolderId, store.folders]);

    // Projects in this folder
    const folderProjects = useMemo(() => {
        return Object.values(store.canvases).filter(
            c => (c.folderId || null) === targetFolderId && !c.mergedCanvasIds
        );
    }, [store.canvases, targetFolderId]);

    const nodeTypes = useMemo(() => ({ step: WorkflowStepNode }), []);
    const edgeTypes = useMemo(() => ({ smart: SmartEdge }), []);

    const currentNodes = useMemo(() => store.projectMapNodes[actualFolderIdStr] || [], [store.projectMapNodes, actualFolderIdStr]);
    const currentEdges = useMemo(() => store.projectMapEdges[actualFolderIdStr] || [], [store.projectMapEdges, actualFolderIdStr]);

    const existingLinkedIds = useMemo(() => new Set(
        currentNodes
            .filter(n => (n.data as { canvasId?: string }).canvasId)
            .map(n => (n.data as { canvasId?: string }).canvasId)
    ), [currentNodes]);

    const handleAddStep = useCallback(() => {
        const newNode: Node = {
            id: `step-${Date.now()}`,
            type: 'step',
            position: { x: 300 + Math.random() * 150, y: 180 + Math.random() * 80 },
            data: { label: 'New step' },
        };
        store.setProjectMapNodes(actualFolderIdStr, [...currentNodes, newNode]);
    }, [store, actualFolderIdStr, currentNodes]);

    const handleMapFromFolder = useCallback(() => {
        if (folderProjects.length === 0) {
            toast.error('No projects in this folder. Add projects from the Dashboard first.');
            return;
        }
        const toAdd = folderProjects.filter(p => !existingLinkedIds.has(p.id));
        if (toAdd.length === 0) {
            toast.success('All folder projects are already on the map.');
            return;
        }
        const COLS = 3;
        const baseX = currentNodes.length > 0
            ? Math.max(...currentNodes.map(n => n.position.x + NODE_W)) + GAP_X
            : -((Math.min(toAdd.length, COLS) * (NODE_W + GAP_X)) / 2);
        const baseY = currentNodes.length > 0
            ? Math.min(...currentNodes.map(n => n.position.y))
            : -(Math.ceil(toAdd.length / COLS) * (NODE_H + GAP_Y)) / 2;

        const newNodes: Node[] = toAdd.map((p, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            return {
                id: `project-${p.id}`,
                type: 'step',
                position: {
                    x: baseX + col * (NODE_W + GAP_X),
                    y: baseY + row * (NODE_H + GAP_Y),
                },
                data: {
                    label: p.name || p.title || 'Untitled',
                    canvasId: p.id,
                    isProject: true,
                },
            };
        });

        store.setProjectMapNodes(actualFolderIdStr, [...currentNodes, ...newNodes]);
        setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 100);
        toast.success(`Added ${toAdd.length} project${toAdd.length !== 1 ? 's' : ''} to map`);
    }, [folderProjects, existingLinkedIds, currentNodes, store, actualFolderIdStr, fitView]);

    const onNodesChange = (changes: NodeChange[]) => store.onProjectMapNodesChange(actualFolderIdStr, changes);
    const onEdgesChange = (changes: EdgeChange[]) => store.onProjectMapEdgesChange(actualFolderIdStr, changes);
    const onConnect = (connection: Connection) => store.onProjectMapConnect(actualFolderIdStr, connection);

    const isEmpty = currentNodes.length === 0;

    return (
        <ReactFlow
            nodes={currentNodes}
            edges={currentEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'smart' }}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1.2 }}
            className="bg-[#050505]"
            zoomOnPinch
            panOnDrag
            preventScrolling
        >
            <Background color="rgba(255,255,255,0.04)" gap={24} size={1} variant={BackgroundVariant.Dots} />
            <Controls
                position="bottom-right"
                className="bg-[#0e0e0e] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-4 mr-4 [&>button]:bg-[#0e0e0e] [&>button]:border-white/[0.06] [&>button]:text-white [&>button:hover]:bg-primary/20"
            />

            <Panel position="top-left" className="m-4 flex flex-col gap-2">
                <button
                    onClick={() => {
                        store.setActiveFolder(targetFolderId || null);
                        navigate('/dashboard');
                    }}
                    className="flex items-center gap-2 text-white/60 hover:text-white bg-[#0e0e0e]/95 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition-all group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-sm font-bold">Back</span>
                </button>
            </Panel>

            <Panel position="top-center" className="m-4 left-1/2 -translate-x-1/2">
                <div className="bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/[0.06] px-6 py-4 rounded-2xl shadow-xl text-center">
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{folderDetails.name}</h1>
                    <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Workflow & dependency map</p>
                    <p className="text-[11px] text-white/30 mt-2 max-w-md mx-auto">
                        Map projects and steps, connect dependencies, and visualize your workflow.
                    </p>
                </div>
            </Panel>

            <Panel position="top-right" className="m-4 flex flex-col sm:flex-row gap-2">
                {targetFolderId && folderProjects.length > 0 && (
                    <button
                        onClick={handleMapFromFolder}
                        className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                    >
                        <FolderOpen size={18} />
                        <span>Add from folder</span>
                    </button>
                )}
                <button
                    onClick={handleAddStep}
                    className="flex items-center gap-2 bg-primary text-black hover:bg-primary/90 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                    <Plus size={18} />
                    <span>Add step</span>
                </button>
            </Panel>

            {isEmpty && (
                <Panel position="top-left" className="left-1/2 -translate-x-1/2 mt-36 pointer-events-none">
                    <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 max-w-md text-center w-[320px]">
                        <LayoutGrid size={48} className="mx-auto text-white/20 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Start your workflow map</h3>
                        <p className="text-sm text-white/50 mb-6">
                            {targetFolderId && folderProjects.length > 0
                                ? 'Click "Add from folder" to map your projects, or "Add step" for custom workflow steps.'
                                : 'Click "Add step" to create workflow steps. Connect them to show dependencies.'}
                        </p>
                        <div className="flex items-center justify-center gap-1 text-white/30 text-xs">
                            <HelpCircle size={14} />
                            <span>Drag between nodes to create connections</span>
                        </div>
                    </div>
                </Panel>
            )}
        </ReactFlow>
    );
}

function WorkflowWithProvider() {
    return (
        <ReactFlowProvider>
            <WorkflowContent />
        </ReactFlowProvider>
    );
}

export default function FolderWorkflow() {
    return (
        <div className="w-full h-screen bg-[#050505] relative">
            <WorkflowWithProvider />
        </div>
    );
}
