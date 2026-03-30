import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
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
import { ArrowLeft, Plus, FolderOpen, LayoutGrid, HelpCircle, Settings2 } from 'lucide-react';
import FolderMapSettingsPanel from './FolderMapSettingsPanel';
import { resolveFolderMapSettings } from '../lib/folderMapSettings';
import { canvasHasUserFacingName } from '../lib/canvasProjectFilter';
import WorkflowStepNode from './nodes/WorkflowStepNode';
import SmartEdge from './edges/SmartEdge';
import toast from 'react-hot-toast';

const NODE_W = 200;
const NODE_H = 120;

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

    const folderRecord = targetFolderId ? store.folders[targetFolderId] : undefined;
    const mapLayout = useMemo(
        () => resolveFolderMapSettings(folderRecord, 'workflow'),
        [folderRecord]
    );

    const [mapOptsOpen, setMapOptsOpen] = useState(false);
    const mapOptsDesktopRef = useRef<HTMLDivElement>(null);
    const mapOptsMobileRef = useRef<HTMLDivElement>(null);
    const mapOptsSheetRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize, { passive: true });
        return () => window.removeEventListener('resize', onResize);
    }, []);
    useEffect(() => {
        if (!mapOptsOpen) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            if (
                mapOptsDesktopRef.current?.contains(t) ||
                mapOptsMobileRef.current?.contains(t) ||
                mapOptsSheetRef.current?.contains(t)
            ) {
                return;
            }
            setMapOptsOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [mapOptsOpen]);

    // Projects in this folder
    const folderProjects = useMemo(() => {
        return Object.values(store.canvases).filter(
            (c) =>
                (c.folderId || null) === targetFolderId &&
                !c.mergedCanvasIds &&
                canvasHasUserFacingName(c)
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
        const stepW = isMobile ? 155 : NODE_W;
        const stepH = isMobile ? 96 : NODE_H;
        const newNode: Node = {
            id: `step-${Date.now()}`,
            type: 'step',
            position: { x: stepW * 1.2, y: stepH * 1.5 },
            data: { label: 'New step' },
        };
        store.setProjectMapNodes(actualFolderIdStr, [...currentNodes, newNode]);
        setTimeout(() => fitView({ duration: 400, padding: isMobile ? 0.35 : 0.2 }), 150);
    }, [store, actualFolderIdStr, currentNodes, fitView, isMobile]);

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
        const COLS = mapLayout.mapColumns;
        const gapX = mapLayout.gapX;
        const gapY = mapLayout.gapY;
        const W = isMobile ? 155 : NODE_W;
        const H = isMobile ? 96 : NODE_H;
        const baseX = currentNodes.length > 0
            ? Math.max(
                  ...currentNodes.map((n) => n.position.x + (n.measured?.width ?? NODE_W))
              ) + gapX
            : -((Math.min(toAdd.length, COLS) * (W + gapX)) / 2);
        const baseY = currentNodes.length > 0
            ? Math.min(...currentNodes.map(n => n.position.y))
            : -(Math.ceil(toAdd.length / COLS) * (H + gapY)) / 2;

        const newNodes: Node[] = toAdd.map((p, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            return {
                id: `project-${p.id}`,
                type: 'step',
                position: {
                    x: baseX + col * (W + gapX),
                    y: baseY + row * (H + gapY),
                },
                data: {
                    label: p.name || p.title || 'Untitled',
                    canvasId: p.id,
                    isProject: true,
                },
            };
        });

        store.setProjectMapNodes(actualFolderIdStr, [...currentNodes, ...newNodes]);
        setTimeout(() => fitView({ duration: 400, padding: isMobile ? 0.35 : 0.15 }), 100);
        toast.success(`Added ${toAdd.length} project${toAdd.length !== 1 ? 's' : ''} to map`);
    }, [folderProjects, existingLinkedIds, currentNodes, store, actualFolderIdStr, fitView, mapLayout, isMobile]);

    const onNodesChange = (changes: NodeChange[]) => store.onProjectMapNodesChange(actualFolderIdStr, changes);
    const onEdgesChange = (changes: EdgeChange[]) => store.onProjectMapEdgesChange(actualFolderIdStr, changes);
    const onConnect = (connection: Connection) => store.onProjectMapConnect(actualFolderIdStr, connection);

    const isEmpty = currentNodes.length === 0;
    const showFolderActions = !!(targetFolderId && folderProjects.length > 0);

    return (
        <>
        <ReactFlow
            nodes={currentNodes}
            edges={currentEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'smart' }}
            defaultViewport={{ x: 0, y: 0, zoom: isMobile ? 0.75 : 0.9 }}
            fitView
            fitViewOptions={{
                padding: isMobile ? 0.28 : 0.2,
                minZoom: isMobile ? 0.22 : 0.5,
                maxZoom: isMobile ? 1.35 : 1.2,
            }}
            minZoom={isMobile ? 0.15 : 0.5}
            maxZoom={isMobile ? 1.5 : 1.2}
            connectionRadius={isMobile ? 56 : 90}
            connectionLineStyle={{ stroke: '#f97316', strokeWidth: 2.5, strokeDasharray: '8 4' }}
            className="bg-[#050505]"
            zoomOnPinch
            panOnDrag
            preventScrolling
        >
            <Background color="rgba(255,255,255,0.04)" gap={24} size={1} variant={BackgroundVariant.Dots} />

            {/* Empty state first + low z-index so header/toolbars always paint above it */}
            {isEmpty && (
                <Panel
                    position="top-left"
                    className="z-[5] pointer-events-none !left-1/2 !top-1/2 !right-auto !-translate-x-1/2 !-translate-y-1/2 !m-0 max-w-[min(100vw-2rem,22rem)] w-full"
                >
                    <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 text-center w-full">
                        <LayoutGrid size={48} className="mx-auto text-white/20 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Start your workflow map</h3>
                        <p className="text-sm text-white/50 mb-6">
                            {targetFolderId && folderProjects.length > 0
                                ? 'Click "Add from folder" to map your projects, or "Add step" for custom workflow steps.'
                                : 'Click "Add step" to create workflow steps. Connect them to show dependencies.'}
                        </p>
                        <div className="flex items-center justify-center gap-1 text-white/30 text-xs">
                            <HelpCircle size={14} />
                            <span>Drag between ideas to create connections</span>
                        </div>
                    </div>
                </Panel>
            )}

            <Controls
                position="bottom-right"
                className="z-20 bg-[#0e0e0e] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-4 mr-4 max-md:!mb-[5.5rem] [&>button]:bg-[#0e0e0e] [&>button]:border-white/[0.06] [&>button]:text-white [&>button:hover]:bg-primary/20"
            />

            <Panel position="top-left" className={`z-40 flex flex-col gap-2 ${isMobile ? 'm-2' : 'm-4'}`}>
                <button
                    onClick={() => {
                        store.setActiveFolder(targetFolderId || null);
                        navigate('/dashboard');
                    }}
                    className="flex items-center gap-2 text-white/60 hover:text-white bg-[#0e0e0e]/95 backdrop-blur-xl px-3 py-2 md:px-4 md:py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition-all group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-xs md:text-sm font-bold">Back</span>
                </button>
            </Panel>

            <Panel position="top-center" className={`z-40 left-1/2 -translate-x-1/2 max-w-[calc(100vw-1rem)] ${isMobile ? 'm-2 mt-14' : 'm-4'}`}>
                <div className="bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/[0.06] px-3 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-xl text-center">
                    <h1 className="text-base md:text-2xl font-black text-white tracking-tight line-clamp-2">{folderDetails.name}</h1>
                    <p className="text-[10px] md:text-xs text-white/40 mt-0.5 md:mt-1 uppercase tracking-wider font-bold">Workflow & dependency map</p>
                    <p className="text-[10px] md:text-[11px] text-white/30 mt-1 md:mt-2 max-w-md mx-auto hidden sm:block">
                        Map projects and steps, connect dependencies, and visualize your workflow.
                    </p>
                </div>
            </Panel>

            <Panel position="top-right" className="z-40 m-4 hidden md:flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                {showFolderActions && (
                    <div className="relative flex items-center gap-1" ref={mapOptsDesktopRef}>
                        <button
                            onClick={handleMapFromFolder}
                            className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                        >
                            <FolderOpen size={18} />
                            <span>Add from folder</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMapOptsOpen((o) => !o)}
                            className={`flex items-center justify-center w-11 h-11 rounded-xl border font-bold transition-all ${
                                mapOptsOpen
                                    ? 'bg-primary/25 border-primary/40 text-primary'
                                    : 'bg-[#0e0e0e] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06]'
                            }`}
                            aria-expanded={mapOptsOpen}
                            aria-label="Folder map layout options"
                            title="Map layout for this folder"
                        >
                            <Settings2 size={18} />
                        </button>
                        {mapOptsOpen && (
                            <div className="absolute right-0 top-[calc(100%+8px)] w-[min(calc(100vw-2rem),20rem)] p-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/98 backdrop-blur-xl shadow-xl z-[200] max-h-[min(70vh,28rem)] overflow-y-auto">
                                <p className="text-xs font-black text-white/90 uppercase tracking-wider mb-3">Folder map</p>
                                <FolderMapSettingsPanel folderId={targetFolderId} showCanvasOptions />
                            </div>
                        )}
                    </div>
                )}
                <button
                    onClick={handleAddStep}
                    className="flex items-center gap-2 bg-primary text-black hover:bg-primary/90 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                    <Plus size={18} />
                    <span>Add step</span>
                </button>
            </Panel>
        </ReactFlow>

        {/* Phone: fixed bar so "Add from folder" / settings / "Add step" are never off-screen */}
        {isMobile && (
            <div
                className="fixed bottom-0 left-0 right-0 z-[100] flex items-stretch justify-center gap-1.5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#060606]/[0.97] backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]"
                ref={mapOptsMobileRef}
            >
                {showFolderActions && (
                    <>
                        <button
                            type="button"
                            onClick={handleMapFromFolder}
                            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl bg-primary/15 text-primary border border-primary/25 font-bold text-[11px] leading-tight"
                        >
                            <FolderOpen size={20} strokeWidth={2.2} />
                            <span className="truncate w-full text-center">From folder</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMapOptsOpen((o) => !o)}
                            className={`shrink-0 flex flex-col items-center justify-center gap-0.5 py-2 px-2.5 rounded-xl border font-bold text-[10px] ${
                                mapOptsOpen
                                    ? 'bg-primary/25 border-primary/40 text-primary'
                                    : 'bg-[#121212] border-white/[0.08] text-white/70'
                            }`}
                            aria-label="Map layout options"
                        >
                            <Settings2 size={20} />
                            <span>Map</span>
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={handleAddStep}
                    className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl bg-primary text-black font-bold text-[11px] leading-tight ${showFolderActions ? '' : 'flex-[2]'}`}
                >
                    <Plus size={22} strokeWidth={2.5} />
                    <span>Add step</span>
                </button>
            </div>
        )}
        {isMobile && mapOptsOpen && showFolderActions && (
            <div
                ref={mapOptsSheetRef}
                className="fixed left-2 right-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[110] max-h-[55vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/98 backdrop-blur-xl p-4 shadow-xl"
            >
                <p className="text-xs font-black text-white/90 uppercase tracking-wider mb-3">Folder map</p>
                {targetFolderId && <FolderMapSettingsPanel folderId={targetFolderId} showCanvasOptions />}
            </div>
        )}
        </>
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
        <div className="w-full h-[100dvh] max-md:pb-[72px] box-border bg-[#050505] relative">
            <WorkflowWithProvider />
        </div>
    );
}
