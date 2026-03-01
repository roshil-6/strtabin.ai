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
import { NotificationManager } from '../services/NotificationManager';

export type Comment = {
    id: string;
    quotedText: string;
    body: string;
    sectionId: string;
    createdAt: number;
};

export type Folder = {
    id: string;
    name: string;
    createdAt: number;
};

export type CanvasData = {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    writingContent?: string;
    title?: string; // Document title
    images?: string[]; // List of image URLs
    attachments?: Array<{ id: string; name: string; url: string }>; // List of documents (PDF, Doc, etc)
    timelineContent?: string; // Manual timeline text
    todos?: Array<{ id: string; text: string; completed: boolean }>; // Project specific to-dos
    comments?: Comment[]; // Inline comments
    linkedCanvases?: string[]; // IDs of linked canvases
    linkedTimelines?: string[]; // IDs of linked timelines
    isPinned?: boolean; // Pin status
    isCurrent?: boolean; // Current focus status
    mergedCanvasIds?: string[]; // IDs of canvases that are part of this merged project
    folderId?: string | null; // Associated folder ID
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
    folderId?: string | null;
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
    folderId?: string | null; // Associated folder ID
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
    duplicateCanvas: (id: string, targetFolderId: string | null) => void;
    setCurrentCanvas: (id: string) => void;
    updateCanvasName: (id: string, name: string) => void;
    updateNodeData: (id: string, data: any) => void;
    updateCanvasWriting: (id: string, content: string) => void;
    updateCanvasTitle: (id: string, title: string) => void;
    addCanvasImage: (id: string, imageUrl: string) => void;
    deleteCanvasImage: (id: string, index: number) => void;
    addCanvasDoc: (id: string, doc: { name: string; url: string }) => void;
    deleteCanvasDoc: (id: string, docId: string) => void;
    ensureCanvasExists: (id: string) => void;
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
    togglePinCanvas: (id: string) => void;
    mergeCanvases: (ids: string[], title: string) => string;

    // Global Calendar
    calendarEvents: Record<string, { id: string; time: string; task: string }[]>;
    addCalendarEvent: (date: string, time: string, task: string) => void;
    removeCalendarEvent: (date: string, eventId: string) => void;

    // Chat History
    chatHistory: Record<string, { role: 'user' | 'assistant'; content: string }[]>;
    addChatMessage: (id: string, message: { role: 'user' | 'assistant'; content: string }) => void;
    clearChatHistory: (id: string) => void;

    // Canvas Comments
    addComment: (canvasId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
    deleteComment: (canvasId: string, commentId: string) => void;

    // Sub-Project & Merged Workflow
    convertNodeToProject: (canvasId: string, nodeId: string) => string;
    addSubCanvasToMerged: (mergedId: string) => string;
    checkNotifications: () => void;
    syncSubProjectNodes: (mergedId: string) => void;
    toggleCurrentProject: (id: string) => void;

    // Folder Management
    folders: Record<string, Folder>;
    activeFolderId: string | null;
    createFolder: (name: string) => void;
    deleteFolder: (id: string) => void;
    updateFolderName: (id: string, name: string) => void;
    setActiveFolder: (id: string | null) => void;
    moveItemToFolder: (itemId: string, type: 'canvas' | 'timeline' | 'diagram', folderId: string | null) => void;

    // Project Map State
    projectMapNodes: Record<string, Node[]>;
    projectMapEdges: Record<string, Edge[]>;
    onProjectMapNodesChange: (folderId: string, changes: NodeChange[]) => void;
    onProjectMapEdgesChange: (folderId: string, changes: EdgeChange[]) => void;
    onProjectMapConnect: (folderId: string, connection: Connection) => void;
    setProjectMapNodes: (folderId: string, nodes: Node[]) => void;

    // User & Subscription
    isAuthenticated: boolean;
    isPaid: boolean;
    setAuthenticated: (status: boolean) => void;
    setPaid: (status: boolean) => void;
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
            chatHistory: {},
            folders: {},
            activeFolderId: null,
            projectMapNodes: {},
            projectMapEdges: {},
            isAuthenticated: false,
            isPaid: false,

            initDefaultCanvas: () => {
                const state = get();
                if (Object.keys(state.canvases).length === 0) {
                    state.createCanvas();
                }
            },

            createCanvas: (initialName?: string) => {
                const id = crypto.randomUUID();
                const folderId = get().activeFolderId;
                const newCanvas: CanvasData = {
                    id,
                    name: initialName || 'New Project',
                    nodes: [],
                    edges: [],
                    folderId,
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

                    // If we deleted a canvas that was part of a merged project, it will just show as missing in that project.
                    // If we deleted a merged project itself, just clear the currentCanvasId if needed.

                    return {
                        canvases: newCanvases,
                        currentCanvasId: state.currentCanvasId === id ? null : state.currentCanvasId,
                    };
                });
            },

            duplicateCanvas: (id, targetFolderId) => {
                set((state) => {
                    const canvasToCopy = state.canvases[id];
                    if (!canvasToCopy) return state;

                    const newId = crypto.randomUUID();
                    const newCanvas: CanvasData = {
                        ...canvasToCopy,
                        id: newId,
                        name: `${canvasToCopy.name} (Copy)`,
                        folderId: targetFolderId,
                        updatedAt: Date.now()
                    };

                    return {
                        ...state,
                        canvases: { ...state.canvases, [newId]: newCanvas }
                    };
                });
            },

            togglePinCanvas: (id) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    if (!canvas) return state;
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: { ...canvas, isPinned: !canvas.isPinned }
                        }
                    };
                });
            },

            mergeCanvases: (ids, title) => {
                const id = crypto.randomUUID();
                const folderId = get().activeFolderId;
                const newCanvas: CanvasData = {
                    id,
                    name: title || 'Merged Project',
                    nodes: [],
                    edges: [],
                    mergedCanvasIds: ids,
                    folderId,
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

            deleteCanvasImage: (id: string, index: number) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    if (!canvas) return state;
                    const currentImages = canvas.images || [];
                    const newImages = [...currentImages];
                    newImages.splice(index, 1);
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: {
                                ...canvas,
                                images: newImages,
                                updatedAt: Date.now()
                            },
                        },
                    };
                });
            },

            addCanvasDoc: (id: string, doc: { name: string; url: string }) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    if (!canvas) return state;
                    const currentDocs = canvas.attachments || [];
                    const newDoc = { ...doc, id: crypto.randomUUID() };
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: {
                                ...canvas,
                                attachments: [...currentDocs, newDoc],
                                updatedAt: Date.now()
                            },
                        },
                    };
                });
            },

            deleteCanvasDoc: (id: string, docId: string) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    if (!canvas) return state;
                    const currentDocs = canvas.attachments || [];
                    const newDocs = currentDocs.filter(p => p.id !== docId);
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: {
                                ...canvas,
                                attachments: newDocs,
                                updatedAt: Date.now()
                            },
                        },
                    };
                });
            },

            ensureCanvasExists: (id: string) => {
                const state = get();
                if (state.canvases[id]) return;

                const newCanvas: CanvasData = {
                    id,
                    name: 'Untitled Strategy',
                    nodes: [],
                    edges: [],
                    folderId: state.activeFolderId,
                    updatedAt: Date.now(),
                    attachments: [],
                    images: [],
                    writingContent: ''
                };

                set((state) => ({
                    canvases: { ...state.canvases, [id]: newCanvas }
                }));
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
                const folderId = get().activeFolderId;
                set((state) => ({
                    diagrams: [
                        ...state.diagrams,
                        {
                            ...diagram,
                            id: `diagram-${Date.now()}`,
                            folderId,
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
                const folderId = get().activeFolderId;
                const newTimeline: Timeline = {
                    id,
                    title: 'New Timeline',
                    startDate: Date.now(),
                    endDate: Date.now() + 604800000,
                    lanes: [],
                    items: [],
                    folderId,
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

            onProjectMapNodesChange: (folderId: string, changes: NodeChange[]) => {
                set((state) => {
                    const currentNodes = state.projectMapNodes[folderId] || [];
                    return {
                        projectMapNodes: {
                            ...state.projectMapNodes,
                            [folderId]: applyNodeChanges(changes, currentNodes)
                        }
                    };
                });
            },

            onProjectMapEdgesChange: (folderId: string, changes: EdgeChange[]) => {
                set((state) => {
                    const currentEdges = state.projectMapEdges[folderId] || [];
                    return {
                        projectMapEdges: {
                            ...state.projectMapEdges,
                            [folderId]: applyEdgeChanges(changes, currentEdges)
                        }
                    };
                });
            },

            onProjectMapConnect: (folderId: string, connection: Connection) => {
                set((state) => {
                    const currentEdges = state.projectMapEdges[folderId] || [];
                    const newEdge: Edge = {
                        ...connection,
                        id: `project-edge-${Date.now()}`,
                        type: 'smart',
                        style: { stroke: '#DA7756', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#DA7756' },
                    };
                    return {
                        projectMapEdges: {
                            ...state.projectMapEdges,
                            [folderId]: addEdge(newEdge, currentEdges)
                        }
                    };
                });
            },

            setProjectMapNodes: (folderId: string, nodes: Node[]) => {
                set((state) => ({
                    projectMapNodes: {
                        ...state.projectMapNodes,
                        [folderId]: nodes
                    }
                }));
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

            addCalendarEvent: (date, time, task) => {
                set((state) => {
                    const currentEvents = state.calendarEvents[date] || [];
                    const newEvent = { id: crypto.randomUUID(), time, task };

                    // Schedule notification
                    NotificationManager.requestPermission().then(granted => {
                        if (granted) {
                            NotificationManager.scheduleNotification(task, time);
                        }
                    });

                    const newEvents = [...currentEvents, newEvent].sort((a, b) => {
                        // Simple sort by time (assuming HH:mm format)
                        return a.time.localeCompare(b.time);
                    });
                    return {
                        calendarEvents: {
                            ...state.calendarEvents,
                            [date]: newEvents
                        }
                    };
                });
            },
            removeCalendarEvent: (date, eventId) => {
                set((state) => {
                    const currentEvents = state.calendarEvents[date] || [];
                    const newEvents = currentEvents.filter((e) => e.id !== eventId);
                    return {
                        calendarEvents: {
                            ...state.calendarEvents,
                            [date]: newEvents
                        }
                    };
                });
            },

            addChatMessage: (id, message) => {
                set((state) => {
                    const currentHistory = state.chatHistory[id] || [];
                    return {
                        chatHistory: {
                            ...state.chatHistory,
                            [id]: [...currentHistory, message]
                        }
                    };
                });
            },

            clearChatHistory: (id) => {
                set((state) => {
                    const newHistory = { ...state.chatHistory };
                    delete newHistory[id];
                    return { chatHistory: newHistory };
                });
            },

            convertNodeToProject: (canvasId, nodeId) => {
                const subId = crypto.randomUUID();
                const folderId = get().activeFolderId;
                const newCanvas: CanvasData = {
                    id: subId,
                    name: 'Sub-Project',
                    nodes: [],
                    edges: [],
                    folderId,
                    updatedAt: Date.now(),
                };

                set((state) => {
                    const canvas = state.canvases[canvasId];
                    if (!canvas) return {};

                    const newNodes = canvas.nodes.map(n =>
                        n.id === nodeId ? { ...n, data: { ...n.data, subCanvasId: subId } } : n
                    );

                    return {
                        canvases: {
                            ...state.canvases,
                            [canvasId]: { ...canvas, nodes: newNodes, updatedAt: Date.now() },
                            [subId]: newCanvas
                        },
                        // If we are currently on this canvas, sync the nodes display
                        nodes: state.currentCanvasId === canvasId ? newNodes : state.nodes
                    };
                });
                return subId;
            },

            addSubCanvasToMerged: (mergedId) => {
                const subId = crypto.randomUUID();
                const folderId = get().activeFolderId;
                const newCanvas: CanvasData = {
                    id: subId,
                    name: 'New Sequence',
                    nodes: [],
                    edges: [],
                    folderId,
                    updatedAt: Date.now(),
                };

                set((state) => {
                    const mergedCanvas = state.canvases[mergedId];
                    if (!mergedCanvas) return {};

                    const existingSubIds = mergedCanvas.mergedCanvasIds || [];
                    return {
                        canvases: {
                            ...state.canvases,
                            [mergedId]: {
                                ...mergedCanvas,
                                mergedCanvasIds: [...existingSubIds, subId],
                                updatedAt: Date.now()
                            },
                            [subId]: newCanvas
                        }
                    };
                });
                return subId;
            },

            checkNotifications: () => {
                const state = get();
                const today = new Date().toISOString().split('T')[0];
                const todayEvents = state.calendarEvents[today] || [];

                if (todayEvents.length > 0) {
                    NotificationManager.requestPermission().then(granted => {
                        if (granted) {
                            todayEvents.forEach(event => {
                                NotificationManager.scheduleNotification(event.task, event.time);
                            });
                        }
                    });
                }
            },

            syncSubProjectNodes: (mergedId) => {
                set((state) => {
                    const mergedCanvas = state.canvases[mergedId];
                    if (!mergedCanvas || !mergedCanvas.mergedCanvasIds) return {};

                    const currentNodes = mergedCanvas.nodes || [];
                    const subCanvasIds = mergedCanvas.mergedCanvasIds;
                    const newNodes = [...currentNodes];
                    let changed = false;

                    subCanvasIds.forEach((subId, index) => {
                        const nodeIndex = currentNodes.findIndex(n => n.data.linkedSubCanvasId === subId);
                        const subCanvas = state.canvases[subId];
                        const sourceName = subCanvas?.title || subCanvas?.name || 'Untitled Project';

                        if (nodeIndex === -1) {
                            // Add missing node
                            newNodes.push({
                                id: `subproject-${subId}`,
                                type: 'subproject',
                                position: { x: 100 + (index * 250), y: 100 },
                                data: {
                                    label: sourceName,
                                    linkedSubCanvasId: subId
                                },
                            });
                            changed = true;
                        } else {
                            // Check if label needs update
                            const node = currentNodes[nodeIndex];
                            if (node.data.label !== sourceName) {
                                newNodes[nodeIndex] = {
                                    ...node,
                                    data: { ...node.data, label: sourceName }
                                };
                                changed = true;
                            }
                        }
                    });

                    if (!changed) return {};

                    return {
                        canvases: {
                            ...state.canvases,
                            [mergedId]: { ...mergedCanvas, nodes: newNodes, updatedAt: Date.now() }
                        },
                        nodes: state.currentCanvasId === mergedId ? newNodes : state.nodes
                    };
                });
            },

            toggleCurrentProject: (id) => {
                set((state) => {
                    const canvas = state.canvases[id];
                    if (!canvas) return {};
                    return {
                        canvases: {
                            ...state.canvases,
                            [id]: { ...canvas, isCurrent: !canvas.isCurrent, updatedAt: Date.now() }
                        }
                    };
                });
            },

            addComment: (canvasId, comment) => {
                set((state) => {
                    const canvas = state.canvases[canvasId];
                    if (!canvas) return {};
                    const newComment = {
                        ...comment,
                        id: crypto.randomUUID(),
                        createdAt: Date.now(),
                    };
                    return {
                        canvases: {
                            ...state.canvases,
                            [canvasId]: {
                                ...canvas,
                                comments: [...(canvas.comments || []), newComment],
                                updatedAt: Date.now(),
                            }
                        }
                    };
                });
            },

            deleteComment: (canvasId, commentId) => {
                set((state) => {
                    const canvas = state.canvases[canvasId];
                    if (!canvas) return {};
                    return {
                        canvases: {
                            ...state.canvases,
                            [canvasId]: {
                                ...canvas,
                                comments: (canvas.comments || []).filter(c => c.id !== commentId),
                                updatedAt: Date.now(),
                            }
                        }
                    };
                });
            },

            createFolder: (name) => {
                const id = crypto.randomUUID();
                const newFolder: Folder = {
                    id,
                    name,
                    createdAt: Date.now(),
                };
                set((state) => ({
                    folders: { ...state.folders, [id]: newFolder },
                    activeFolderId: id, // switch to newly created folder
                }));
            },

            deleteFolder: (id) => {
                set((state) => {
                    const newFolders = { ...state.folders };
                    delete newFolders[id];

                    // Move items in this folder to general (null) or delete them?
                    // User said "folders will be having same features", usually implies projects are contained.
                    // For safety, let's keep projects but reset their folderId to null (General).

                    const newCanvases = { ...state.canvases };
                    Object.keys(newCanvases).forEach(cid => {
                        if (newCanvases[cid].folderId === id) {
                            newCanvases[cid] = { ...newCanvases[cid], folderId: null };
                        }
                    });

                    const newTimelines = { ...state.timelines };
                    Object.keys(newTimelines).forEach(tid => {
                        if (newTimelines[tid].folderId === id) {
                            newTimelines[tid] = { ...newTimelines[tid], folderId: null };
                        }
                    });

                    return {
                        folders: newFolders,
                        canvases: newCanvases,
                        timelines: newTimelines,
                        activeFolderId: state.activeFolderId === id ? null : state.activeFolderId,
                    };
                });
            },

            updateFolderName: (id, name) => {
                set((state) => {
                    const folder = state.folders[id];
                    if (!folder) return {};
                    return {
                        folders: {
                            ...state.folders,
                            [id]: { ...folder, name }
                        }
                    };
                });
            },

            setActiveFolder: (id) => {
                set({ activeFolderId: id });
            },

            moveItemToFolder: (itemId, type, folderId) => {
                set((state) => {
                    if (type === 'canvas') {
                        const canvas = state.canvases[itemId];
                        if (!canvas) return {};
                        return {
                            canvases: {
                                ...state.canvases,
                                [itemId]: { ...canvas, folderId, updatedAt: Date.now() }
                            }
                        };
                    } else if (type === 'timeline') {
                        const timeline = state.timelines[itemId];
                        if (!timeline) return {};
                        return {
                            timelines: {
                                ...state.timelines,
                                [itemId]: { ...timeline, folderId, updatedAt: Date.now() }
                            }
                        };
                    } else if (type === 'diagram') {
                        return {
                            diagrams: state.diagrams.map(d =>
                                d.id === itemId ? { ...d, folderId, updatedAt: Date.now() } : d
                            )
                        };
                    }
                    return {};
                });
            },

            setAuthenticated: (status: boolean) => set({ isAuthenticated: status }),
            setPaid: (status: boolean) => set({ isPaid: status }),
        }),
        {
            name: 'startergy-box-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useStore;
