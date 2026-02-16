import { Type, GitBranch, Split, Image as ImageIcon } from 'lucide-react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { type Node, type Edge, MarkerType } from '@xyflow/react';

export default function Toolbar() {
    const { addNode, addEdge, nodes } = useStore(useShallow(state => ({
        addNode: state.addNode,
        addEdge: state.addEdge,
        nodes: state.nodes
    })));

    const getSelectedNode = () => nodes.find(n => n.selected);

    const handleAddText = () => {
        // Offset from center or random if nothing selected
        addNode({
            id: `node-${Date.now()}`,
            type: 'text',
            position: { x: 250 + Math.random() * 50, y: 250 + Math.random() * 50 },
            data: { label: '' },
        });
    };

    const handleBranch = () => {
        const selectedNode = getSelectedNode();
        if (!selectedNode) return alert("Select a node to branch from.");

        const newNodeId = `node-${Date.now()}`;
        const newNode: Node = {
            id: newNodeId,
            type: 'text',
            position: { x: selectedNode.position.x + 300, y: selectedNode.position.y },
            data: { label: '' },
            selected: true, // Select new node for flow
        };

        const newEdge: Edge = {
            id: `edge-${Date.now()}`,
            source: selectedNode.id,
            target: newNodeId,
            type: 'default', // or smoothstep
            style: { stroke: '#00ff87', strokeWidth: 2, opacity: 0.6 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#00ff87' },
        };

        addNode(newNode);
        addEdge(newEdge);
    };

    const handleSplit = () => {
        const selectedNode = getSelectedNode();
        if (!selectedNode) return alert("Select a node to split.");

        const time = Date.now();
        const idA = `node-${time}-a`;
        const idB = `node-${time}-b`;

        const nodeA: Node = {
            id: idA,
            type: 'text',
            position: { x: selectedNode.position.x + 300, y: selectedNode.position.y - 100 },
            data: { label: 'Option A' },
        };

        const nodeB: Node = {
            id: idB,
            type: 'text',
            position: { x: selectedNode.position.x + 300, y: selectedNode.position.y + 100 },
            data: { label: 'Option B' },
        };

        const edgeA: Edge = {
            id: `edge-${time}-a`,
            source: selectedNode.id,
            target: idA,
            style: { stroke: '#00ff87', strokeWidth: 2, opacity: 0.6 },
        };

        const edgeB: Edge = {
            id: `edge-${time}-b`,
            source: selectedNode.id,
            target: idB,
            style: { stroke: '#00ff87', strokeWidth: 2, opacity: 0.6 },
        };

        addNode(nodeA);
        addNode(nodeB);
        addEdge(edgeA);
        addEdge(edgeB);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imgUrl = event.target?.result;
            addNode({
                id: `node-img-${Date.now()}`,
                type: 'image',
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 }, // Center-ish
                data: { label: 'Image', imgUrl },
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 bg-[#1a1a1a]/90 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl">
                <button
                    onClick={handleAddText}
                    className="p-3 text-secondary hover:text-white hover:bg-white/10 rounded-full transition-all"
                    title="Add Text"
                >
                    <Type size={20} />
                </button>
                <div className="w-px h-6 bg-white/10" />
                <button
                    onClick={handleBranch}
                    className="p-3 text-secondary hover:text-primary hover:bg-white/10 rounded-full transition-all"
                    title="Branch Out"
                >
                    <GitBranch size={20} />
                </button>
                <button
                    onClick={handleSplit}
                    className="p-3 text-secondary hover:text-primary hover:bg-white/10 rounded-full transition-all"
                    title="Split Logic"
                >
                    <Split size={20} />
                </button>
                <div className="w-px h-6 bg-white/10" />
                <label
                    className="p-3 text-secondary hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                    title="Add Image"
                >
                    <ImageIcon size={20} />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                    />
                </label>
            </div>
        </div>
    );
}
