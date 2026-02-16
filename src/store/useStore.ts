import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    MarkerType,
} from '@xyflow/react';

export type CanvasData = {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    writingContent?: string;
    title?: string; // Document title
    images?: string[]; // List of image URLs
    timelineContent?: string; // Manual timeline text
    todos?: Array<{ id: string; text: string; completed: boolean }>; // Project specific to-dos
    linkedCanvases?: string[]; // IDs of linked canvases
    linkedTimelines?: string[]; // IDs of linked timelines
    updatedAt: number;
};

export type BranchData = {
    root: string;
    branches: Array<{
        id: string;
        label: string;
        level: number;
    }>;
};

export type FlowchartData = {
    nodes: Array<{
        id: string;
        type: 'start' | 'process' | 'decision' | 'end';
        label: string;
        position: { x: number; y: number };
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        label?: string;
    }>;
};

export type Diagram = {
    id: string;
    canvasId: string;
    canvasName: string;
    type: 'branch' | 'flowchart';
    sourceText: string;
    data: BranchData | FlowchartData;
    createdAt: number;
    updatedAt: number;
};

// Timeline Types
export type TimelineItem = {
    id: string;
    laneId: string;
    title: string;
    startDate: number;
    duration: number; // in days
    completed: boolean;
    linkedCanvasId?: string; // Deep link to a strategy canvas
};

export type NodeData = {
    label: string;
    imgUrl?: string;
    subCanvasId?: string; // For nested architecture
};

// Node type imported from @xyflow/react


export type TimelineLane = {
    id: string;
    title: string;
    color: string;
};

export type Timeline = {
    id: string;
    title: string;
    startDate: number;
    endDate: number;
    lanes: TimelineLane[];
    items: TimelineItem[];
    linkedCanvases?: string[]; // IDs of linked strategy canvases
    createdAt: number;
    updatedAt: number;
};

export type RFState = {
    // Canvas Management
    canvases: Record<string, CanvasData>;
    currentCanvasId: string | null;
    createCanvas: () => string;
    initDefaultCanvas: () => void;
    deleteCanvas: (id: string) => void;
    setCurrentCanvas: (id: string) => void;
    updateCanvasName: (id: string, name: string) => void;
    updateNodeData: (id: string, data: any) => void;
    updateCanvasWriting: (id: string, content: string) => void;
    updateCanvasTitle: (id: string, title: string) => void;
    addCanvasImage: (id: string, imageUrl: string) => void;
    updateCanvasTimeline: (id: string, content: string) => void;
    addCanvasTodo: (id: string, text: string) => void;
    toggleCanvasTodo: (id: string, todoId: string) => void;
    deleteCanvasTodo: (id: string, todoId: string) => void;

    // Diagram Management
    diagrams: Diagram[];
    createDiagram: (diagram: Omit<Diagram, 'id' | 'createdAt' | 'updatedAt'>) => void;
    deleteDiagram: (id: string) => void;
    updateDiagram: (id: string, data: Partial<Diagram>) => void;

    // Canvas Linking
    linkCanvas: (sourceId: string, targetId: string) => void;

    // Timeline Management
    timelines: Record<string, Timeline>;
    createTimeline: () => string;
    deleteTimeline: (id: string) => void;
    updateTimeline: (id: string, data: Partial<Timeline>) => void;
    linkTimelineToCanvas: (timelineId: string, canvasId: string) => void;

    // React Flow State (proxied to current canvas)
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (node: Node) => void;
    addEdge: (edge: Edge) => void;
    deleteEdge: (id: string) => void;

    // Global Calendar
    calendarEvents: Record<string, string[]>;
    addCalendarEvent: (date: string, event: string) => void;
    removeCalendarEvent: (date: string, index: number) => void;
};

const useStore = create<RFState>()(
    persist(
        (set, get) => ({
            canvases: {},
            currentCanvasId: null,
            nodes: [],
            edges: [],
            diagrams: [],
            timelines: {},
            calendarEvents: {},

            initDefaultCanvas: () => {
                const state = get();
                if (Object.keys(state.canvases).length === 0) {
                    state.createCanvas();
                }
            },

            createCanvas: () => {
                const id = crypto.randomUUID();
                const newCanvas: CanvasData = {
                    id,
                    name: 'Untitled Canvas',
                    nodes: [],
                    edges: [],
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    canvases: { ...state.canvases, [id]: newCanvas },
                    currentCanvasId: id,
                    nodes: [],
                    edges: [],
                }));
                return id;
            },

            deleteCanvas: (id) => {
                set((state) => {
                    const newCanvases = { ...state.canvases };
                    delete newCanvases[id];
                    return {
                        canvases: newCanvases,
                        currentCanvasId: state.currentCanvasId === id ? null : state.currentCanvasId,
                    };
                });
            },

            setCurrentCanvas: (id) => {
                const state = get();
                const canvas = state.canvases[id];
                if (canvas) {
                    set({
                        currentCanvasId: id,
                        nodes: canvas.nodes || [],
                        edges: canvas.edges || []
                    });
                }
            },

            updateCanvasName: (id, name) => {
                set((state) => ({
                    canvases: {
                        ...state.canvases,
                        [id]: { ...state.canvases[id], name, updatedAt: Date.now() },
                    },
                }));
            },

            updateNodeData: (id, data) => {
                set((state) => {
                    const newNodes = state.nodes.map((node) => {
                        if (node.id === id) {
                            return { ...node, data: { ...node.data, ...data } };
                        }
                        return node;
                    });

                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], nodes: newNodes, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        nodes: newNodes,
                        canvases: newCanvases,
                    };
                });
            },

            updateCanvasWriting: (id, content) => {
                set((state) => ({
                    canvases: {
                        ...state.canvases,
                        [id]: { ...state.canvases[id], writingContent: content, updatedAt: Date.now() },
                    },
                }));
            },

            updateCanvasTitle: (id, title) => {
                set((state) => ({
                    canvases: {
                        ...state.canvases,
                        [id]: { ...state.canvases[id], title, updatedAt: Date.now() },
                    },
                }));
            },

            addCanvasImage: (id, imageUrl) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    const currentImages = canvas.images || [];
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: {
                                ...canvas,
                                images: [...currentImages, imageUrl],
                                updatedAt: Date.now()
                            },
                        },
                    };
                });
            },

            updateCanvasTimeline: (id, content) => {
                set((state) => ({
                    canvases: {
                        ...state.canvases,
                        [id]: { ...state.canvases[id], timelineContent: content, updatedAt: Date.now() },
                    },
                }));
            },

            addCanvasTodo: (id, text) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    const currentTodos = canvas.todos || [];
                    const newTodo = { id: crypto.randomUUID(), text, completed: false };
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: { ...canvas, todos: [...currentTodos, newTodo], updatedAt: Date.now() },
                        },
                    };
                });
            },

            toggleCanvasTodo: (id, todoId) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    const currentTodos = canvas.todos || [];
                    const newTodos = currentTodos.map(t =>
                        t.id === todoId ? { ...t, completed: !t.completed } : t
                    );
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: { ...canvas, todos: newTodos, updatedAt: Date.now() },
                        },
                    };
                });
            },

            deleteCanvasTodo: (id, todoId) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    const currentTodos = canvas.todos || [];
                    const newTodos = currentTodos.filter(t => t.id !== todoId);
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: { ...canvas, todos: newTodos, updatedAt: Date.now() },
                        },
                    };
                });
            },

            // Diagram Management
            createDiagram: (diagram) => {
                set((state) => ({
                    diagrams: [
                        ...state.diagrams,
                        {
                            ...diagram,
                            id: `diagram-${Date.now()}`,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        },
                    ],
                }));
            },

            deleteDiagram: (id) => {
                set((state) => ({
                    diagrams: state.diagrams.filter((d) => d.id !== id),
                }));
            },

            updateDiagram: (id, data) => {
                set((state) => ({
                    diagrams: state.diagrams.map((d) =>
                        d.id === id ? { ...d, ...data, updatedAt: Date.now() } : d
                    ),
                }));
            },

            linkCanvas: (sourceId, targetId) => {
                set((state) => {
                    const sourceCanvas = state.canvases[sourceId];
                    if (!sourceCanvas) return {};

                    const existingLinks = sourceCanvas.linkedCanvases || [];
                    if (existingLinks.includes(targetId)) return {};

                    return {
                        canvases: {
                            ...state.canvases,
                            [sourceId]: {
                                ...sourceCanvas,
                                linkedCanvases: [...existingLinks, targetId],
                                updatedAt: Date.now(),
                            }
                        }
                    };
                });
            },

            // Timeline Management Implementation
            createTimeline: () => {
                const id = crypto.randomUUID();
                const newTimeline: Timeline = {
                    id,
                    title: 'New Timeline',
                    startDate: Date.now(),
                    endDate: Date.now() + 604800000,
                    lanes: [],
                    items: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                set((state) => ({
                    timelines: { ...state.timelines, [id]: newTimeline }
                }));
                return id;
            },

            deleteTimeline: (id) => {
                set((state) => {
                    const newTimelines = { ...state.timelines };
                    delete newTimelines[id];
                    return { timelines: newTimelines };
                });
            },

            updateTimeline: (id, data) => {
                set((state) => ({
                    timelines: {
                        ...state.timelines,
                        [id]: { ...state.timelines[id], ...data, updatedAt: Date.now() }
                    }
                }));
            },

            linkTimelineToCanvas: (timelineId, canvasId) => {
                set((state) => {
                    const timeline = state.timelines[timelineId];
                    if (!timeline) return {};
                    const existingLinks = timeline.linkedCanvases || [];
                    if (existingLinks.includes(canvasId)) return {};

                    return {
                        timelines: {
                            ...state.timelines,
                            [timelineId]: {
                                ...timeline,
                                linkedCanvases: [...existingLinks, canvasId],
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            onNodesChange: (changes: NodeChange[]) => {
                set((state) => {
                    const newNodes = applyNodeChanges(changes, state.nodes);
                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], nodes: newNodes, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        nodes: newNodes,
                        canvases: newCanvases
                    };
                });
            },

            onEdgesChange: (changes: EdgeChange[]) => {
                set((state) => {
                    const newEdges = applyEdgeChanges(changes, state.edges);
                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], edges: newEdges, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        edges: newEdges,
                        canvases: newCanvases
                    };
                });
            },

            onConnect: (connection: Connection) => {
                set((state) => {
                    const newEdge: Edge = {
                        ...connection,
                        id: `edge-${Date.now()}`,
                        type: 'smoothstep', // Use smoothstep by default
                        style: { stroke: '#DA7756', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#DA7756' },
                    };
                    const newEdges = addEdge(newEdge, state.edges);
                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], edges: newEdges, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        edges: newEdges,
                        canvases: newCanvases
                    };
                });
            },

            addNode: (node: Node) => {
                set((state) => {
                    const newNodes = [...state.nodes, node];
                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], nodes: newNodes, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        nodes: newNodes,
                        canvases: newCanvases
                    };
                });
            },

            addEdge: (edge: Edge) => {
                set((state) => {
                    const newEdges = [...state.edges, edge];
                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], edges: newEdges, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        edges: newEdges,
                        canvases: newCanvases
                    };
                });
            },

            deleteEdge: (id: string) => {
                set((state) => {
                    const newEdges = state.edges.filter((e) => e.id !== id);
                    // Sync with canvases map
                    const currentId = state.currentCanvasId;
                    const newCanvases = currentId ? {
                        ...state.canvases,
                        [currentId]: { ...state.canvases[currentId], edges: newEdges, updatedAt: Date.now() }
                    } : state.canvases;

                    return {
                        edges: newEdges,
                        canvases: newCanvases
                    };
                });
            },

            addCalendarEvent: (date, event) => {
                set((state) => {
                    const currentEvents = state.calendarEvents[date] || [];
                    return {
                        calendarEvents: {
                            ...state.calendarEvents,
                            [date]: [...currentEvents, event]
                        }
                    };
                });
            },

            removeCalendarEvent: (date, index) => {
                set((state) => {
                    const currentEvents = state.calendarEvents[date] || [];
                    const newEvents = currentEvents.filter((_, i) => i !== index);
                    // If empty, remove the key entirely or keep empty array? Keep empty for simplicity or remove.
                    return {
                        calendarEvents: {
                            ...state.calendarEvents,
                            [date]: newEvents
                        }
                    };
                });
            },
        }),
        {
            name: 'startergy-box-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useStore;
