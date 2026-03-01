import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import FolderNode from './nodes/FolderNode';
import SmartEdge from './edges/SmartEdge';

function WorkflowContent() {
    const navigate = useNavigate();
    const store = useStore();
    const { fitView } = useReactFlow();

    const nodeTypes = useMemo(() => ({
        folder: FolderNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        smart: SmartEdge,
    }), []);

    // Generate nodes on mount if they don't exist
    useEffect(() => {
        // Collect all folders
        const allFolders = [
            { id: 'general-projects-root-id', name: 'General Projects' },
            ...Object.values(store.folders)
        ];

        // Check if we need to add nodes
        const existingNodeIds = new Set(store.folderNodes.map(n => n.id));
        const newNodes: Node[] = [];

        let currentY = 100;

        allFolders.forEach((f, idx) => {
            if (!existingNodeIds.has(f.id)) {
                newNodes.push({
                    id: f.id,
                    type: 'folder',
                    position: { x: 400 + (idx % 3) * 350, y: currentY + Math.floor(idx / 3) * 250 },
                    data: {
                        label: f.name,
                        targetFolderId: f.id === 'general-projects-root-id' ? null : f.id
                    }
                });
            }
        });

        if (newNodes.length > 0) {
            // Add them
            const combined = [...store.folderNodes, ...newNodes];
            store.setFolderNodes(combined);
            setTimeout(() => {
                fitView({ duration: 800, padding: 0.2 });
            }, 100);
        }
    }, [store.folders, store.folderNodes.length]);

    // Enhance nodes with click handler
    const enhancedNodes = useMemo(() => {
        return store.folderNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onOpenFolder: () => {
                    store.setActiveFolder(node.data.targetFolderId as string | null);
                    navigate('/dashboard');
                }
            }
        }));
    }, [store.folderNodes, store.setActiveFolder, navigate]);

    return (
        <ReactFlow
            nodes={enhancedNodes}
            edges={store.folderEdges}
            onNodesChange={store.onFolderNodesChange}
            onEdgesChange={store.onFolderEdgesChange}
            onConnect={store.onFolderConnect}
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
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/50 hover:text-white bg-[#1a1a1a]/80 backdrop-blur-md px-4 py-2 md:px-5 md:py-2.5 rounded-xl border border-white/10 transition-all shadow-lg hover:bg-white/5 group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-wider">Back to Dashboard</span>
                </button>
            </Panel>

            <Panel position="top-center" className="m-6 bg-black/50 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl pointer-events-none">
                <div className="text-center">
                    <h1 className="text-2xl font-black text-white tracking-tighter mb-1">Workspace Map</h1>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Connect your folders to map your organizational workflow</p>
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
