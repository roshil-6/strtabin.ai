import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    BackgroundVariant,
    type Node,
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
    const onNodesChange = (changes: any) => store.onProjectMapNodesChange(folderId || 'general', changes);
    const onEdgesChange = (changes: any) => store.onProjectMapEdgesChange(folderId || 'general', changes);
    const onConnect = (connection: any) => store.onProjectMapConnect(folderId || 'general', connection);

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
            className="bg-[#080808]"
        >
            <Background color="#333" gap={32} size={1} variant={BackgroundVariant.Dots} />

            {/* Make Controls visible by passing custom tailwind style classes, overriding their default white boxes so they look good on dark theme */}
            <Controls position="bottom-right" className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl mb-6 mr-6 [&>button]:bg-[#1a1a1a] [&>button]:border-white/10 [&>button]:text-white [&>button:hover]:bg-white/10" />

            <Panel position="top-left" className="m-6">
                <button
                    onClick={() => {
                        store.setActiveFolder(targetFolderId || null);
                        navigate('/dashboard');
                    }}
                    className="flex items-center gap-2 text-white/50 hover:text-white bg-[#1a1a1a]/80 backdrop-blur-md px-4 py-2 md:px-5 md:py-2.5 rounded-xl border border-white/10 transition-all shadow-lg hover:bg-white/5 group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-wider">Back to Dashboard</span>
                </button>
            </Panel>

            <Panel position="top-center" className="m-6 bg-black/50 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl pointer-events-none">
                <div className="text-center">
                    <h1 className="text-2xl font-black text-white tracking-tighter mb-1">{folderDetails.name} Workflow</h1>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                        Map out your folder structure
                    </p>
                </div>
            </Panel>

            <Panel position="top-right" className="m-6 flex gap-3">
                <button
                    onClick={handleAddStep}
                    className="flex items-center gap-2 bg-primary hover:bg-orange-500 text-black px-4 py-2.5 rounded-xl transition-all shadow-lg font-bold text-sm tracking-wide"
                >
                    <Plus size={18} />
                    Add Box
                </button>
            </Panel>
        </ReactFlow>
    );
}

export default function FolderWorkflow() {
    return (
        <div className="w-full h-screen bg-[#080808] relative">
            <ReactFlowProvider>
                <WorkflowContent />
            </ReactFlowProvider>
        </div>
    );
}
