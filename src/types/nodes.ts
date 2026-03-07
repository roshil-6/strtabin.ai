import type { Node, NodeProps } from '@xyflow/react';

export interface TextNodeData extends Record<string, unknown> {
    label: string;
}

export interface ImageNodeData extends Record<string, unknown> {
    imgUrl: string;
    label?: string;
}

export interface SubProjectNodeData extends Record<string, unknown> {
    label: string;
    canvasId?: string;
    linkedSubCanvasId?: string;
    onViewWorkflow?: () => void;
}

export interface ThinkingNodeData extends Record<string, unknown> {
    label: string;
}

export interface WorkflowStepNodeData extends Record<string, unknown> {
    label: string;
    description?: string;
    status?: 'pending' | 'active' | 'done';
}

// Node types (full Node objects)
export type TextNodeType = Node<TextNodeData>;
export type ImageNodeType = Node<ImageNodeData>;
export type SubProjectNodeType = Node<SubProjectNodeData>;
export type ThinkingNodeType = Node<ThinkingNodeData>;
export type WorkflowStepNodeType = Node<WorkflowStepNodeData>;

// NodeProps types (for component props)
export type TextNodeProps = NodeProps<TextNodeType>;
export type ImageNodeProps = NodeProps<ImageNodeType>;
export type SubProjectNodeProps = NodeProps<SubProjectNodeType>;
export type ThinkingNodeProps = NodeProps<ThinkingNodeType>;
export type WorkflowStepNodeProps = NodeProps<WorkflowStepNodeType>;

export interface ProjectContext {
    name: string;
    nodes?: number;
    edges?: number;
    todos?: Array<{ id: string; text: string; completed: boolean }>;
    lastUpdated?: string;
    nodeLabels?: (string | undefined)[];
    writingContent?: string;
}
