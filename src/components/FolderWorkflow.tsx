import { useMemo } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useStore from '../store/useStore';
import { ArrowLeft, Plus } from 'lucide-react';
import WorkflowStepNode from './nodes/WorkflowStepNode';
import SmartEdge from './edges/SmartEdge';

function WorkflowContent() {
    const navigate = useNavigate();
    const { folderId } = useParams<{ folderId: string }>();
    const store = useStore();

    // Determine target folder ID (null for general projects)
    const targetFolderId = folderId === 'general' ? null : folderId;

    // Get folder details for header
    const folderDetails = useMemo(() => {
        if (!targetFolderId) return { name: 'General Projects', id: 'general' };
        return store.folders[targetFolderId] || { name: 'Unknown Folder', id: targetFolderId };
    }, [targetFolderId, store.folders]);

    const nodeTypes = useMemo(() => ({
        step: WorkflowStepNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        smart: SmartEdge,
    }), []);

    // Get nodes and edges for THIS specific folder
    const currentNodes = useMemo(() => store.projectMapNodes[folderId || 'general'] || [], [store.projectMapNodes, folderId]);
    const currentEdges = useMemo(() => store.projectMapEdges[folderId || 'general'] || [], [store.projectMapEdges, folderId]);

    const handleAddStep = () => {
        const actualFolderIdStr = folderId || 'general';
        const newNode: Node = {
            id: `step-${Date.now()}`,
            type: 'step',
            position: { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 }, // Drop slightly offset to center
            data: { label: 'New Workflow Step' }
        };
        const combined = [...currentNodes, newNode];
        store.setProjectMapNodes(actualFolderIdStr, combined);
    };

    // Curry the change handlers with the current folder ID
    const onNodesChange = (changes: NodeChange[]) => store.onProjectMapNodesChange(folderId || 'general', changes);
    const onEdgesChange = (changes: EdgeChange[]) => store.onProjectMapEdgesChange(folderId || 'general', changes);
    const onConnect = (connection: Connection) => store.onProjectMapConnect(folderId || 'general', connection);

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
            className="bg-[#050505]"
            zoomOnPinch={true}
            panOnDrag={true}
            preventScrolling={true}
        >
            <Background color="#222" gap={32} size={1} variant={BackgroundVariant.Dots} />

            <Controls position="bottom-right" className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-4 mr-3 md:mb-6 md:mr-6 [&>button]:bg-[#0e0e0e] [&>button]:border-white/[0.06] [&>button]:text-white [&>button:hover]:bg-white/10" />

            <Panel position="top-left" className="m-3 md:m-6">
                <button
                    onClick={() => {
                        store.setActiveFolder(targetFolderId || null);
                        navigate('/dashboard');
                    }}
                    className="flex items-center gap-1.5 md:gap-2 text-white/50 hover:text-white bg-[#0e0e0e]/90 backdrop-blur-xl px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl border border-white/[0.06] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:bg-white/5 active:scale-95 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[11px] md:text-sm font-bold uppercase tracking-wider">Back</span>
                </button>
            </Panel>

            <Panel position="top-center" className="m-3 md:m-6 bg-[#060606]/80 backdrop-blur-2xl border border-white/[0.06] px-4 py-2.5 md:px-6 md:py-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-none">
                <div className="text-center">
                    <h1 className="text-base md:text-2xl font-black text-white tracking-tighter mb-0.5">{folderDetails.name}</h1>
                    <p className="text-[9px] md:text-xs text-white/30 uppercase tracking-widest font-bold">
                        Workflow Map
                    </p>
                </div>
            </Panel>

            <Panel position="top-right" className="m-3 md:m-6 flex gap-2 md:gap-3">
                <button
                    onClick={handleAddStep}
                    className="flex items-center gap-1.5 md:gap-2 bg-primary hover:bg-orange-500 text-black px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition-all shadow-lg active:scale-95 font-bold text-xs md:text-sm tracking-wide"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add Box</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </Panel>
        </ReactFlow>
    );
}

export default function FolderWorkflow() {
    return (
        <div className="w-full h-screen bg-[#050505] relative">
            <ReactFlowProvider>
                <WorkflowContent />
            </ReactFlowProvider>
        </div>
    );
}
