import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import useStore from '../store/useStore';
import { ArrowLeft } from 'lucide-react';
import ProjectNode from './nodes/ProjectNode';
import SmartEdge from './edges/SmartEdge';

function WorkflowContent() {
    const navigate = useNavigate();
    const { folderId } = useParams<{ folderId: string }>();
    const store = useStore();
    const { fitView } = useReactFlow();

    // Determine target folder ID (null for general projects)
    const targetFolderId = folderId === 'general' ? null : folderId;

    // Get folder details for header
    const folderDetails = useMemo(() => {
        if (!targetFolderId) return { name: 'General Projects', id: 'general' };
        return store.folders[targetFolderId] || { name: 'Unknown Folder', id: targetFolderId };
    }, [targetFolderId, store.folders]);

    const nodeTypes = useMemo(() => ({
        project: ProjectNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        smart: SmartEdge,
    }), []);

    // Get nodes and edges for THIS specific folder
    const currentNodes = useMemo(() => store.projectMapNodes[folderId || 'general'] || [], [store.projectMapNodes, folderId]);
    const currentEdges = useMemo(() => store.projectMapEdges[folderId || 'general'] || [], [store.projectMapEdges, folderId]);

    // Generate nodes on mount if they don't exist
    useEffect(() => {
        const actualFolderIdStr = folderId || 'general';

        // Find all canvases belonging to this folder
        const folderCanvases = Object.values(store.canvases).filter(c =>
            (targetFolderId === null && !c.folderId) || (c.folderId === targetFolderId)
        );

        // Check if we need to add nodes
        const existingNodeIds = new Set(currentNodes.map(n => n.id));
        const newNodes: Node[] = [];

        let currentY = 100;

        folderCanvases.forEach((c, idx) => {
            if (!existingNodeIds.has(c.id)) {
                newNodes.push({
                    id: c.id,
                    type: 'project',
                    position: { x: 400 + (idx % 3) * 350, y: currentY + Math.floor(idx / 3) * 250 },
                    data: {
                        label: c.name || 'Untitled Canvas',
                        targetProjectId: c.id
                    }
                });
            }
        });

        if (newNodes.length > 0) {
            // Add them
            const combined = [...currentNodes, ...newNodes];
            store.setProjectMapNodes(actualFolderIdStr, combined);
            setTimeout(() => {
                fitView({ duration: 800, padding: 0.2 });
            }, 100);
        }
    }, [store.canvases, currentNodes.length, folderId, targetFolderId, store.setProjectMapNodes, fitView]);

    // Enhance nodes with click handler
    const enhancedNodes = useMemo(() => {
        return currentNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onOpenProject: () => {
                    store.setActiveFolder(targetFolderId || null);
                    navigate(`/strategy/${node.data.targetProjectId}`);
                }
            }
        }));
    }, [currentNodes, targetFolderId, store.setActiveFolder, navigate]);

    // Curry the change handlers with the current folder ID
    const onNodesChange = (changes: any) => store.onProjectMapNodesChange(folderId || 'general', changes);
    const onEdgesChange = (changes: any) => store.onProjectMapEdgesChange(folderId || 'general', changes);
    const onConnect = (connection: any) => store.onProjectMapConnect(folderId || 'general', connection);

    return (
        <ReactFlow
            nodes={enhancedNodes}
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
            <Controls className="!bg-[#1a1a1a] !border-white/10 !fill-white" />

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
                    <h1 className="text-2xl font-black text-white tracking-tighter mb-1">Project Map</h1>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                        {folderDetails.name} Workflow
                    </p>
                </div>
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
