import { create } from 'zustand';
import { MarkerType, type Node as RFNode, type Edge as RFEdge } from 'reactflow';
import type { Flow, FlowNode, FlowEdge, NodeData, NodeType } from '@process-flow/shared';
import { flowsApi } from '../api/flows';

function toRFNode(node: FlowNode): RFNode<NodeData> {
  return {
    id: node.id,
    type: 'processNode',
    position: { x: node.positionX, y: node.positionY },
    data: node.data,
  };
}

function toRFEdge(edge: FlowEdge): RFEdge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: edge.label ?? undefined,
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  };
}

const nodeTypeColors: Record<NodeType, string> = {
  process: '#6366f1',
  decision: '#f59e0b',
  delay: '#8b5cf6',
  start: '#10b981',
  end: '#ef4444',
};

interface FlowState {
  flow: Flow | null;
  rfNodes: RFNode<NodeData>[];
  rfEdges: RFEdge[];
  selectedNodeId: string | null;
  loading: boolean;
  error: string | null;

  loadFlow: (id: string) => Promise<void>;
  setRfNodes: (nodes: RFNode<NodeData>[]) => void;
  setRfEdges: (edges: RFEdge[]) => void;
  setSelectedNode: (id: string | null) => void;

  addNode: (flowId: string, nodeType: NodeType, position: { x: number; y: number }) => Promise<void>;
  updateNode: (flowId: string, nodeId: string, data: Partial<NodeData>) => Promise<void>;
  updatePositions: (flowId: string, positions: Array<{ id: string; positionX: number; positionY: number }>) => Promise<void>;
  deleteNode: (flowId: string, nodeId: string) => Promise<void>;
  addEdge: (flowId: string, connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => Promise<void>;
  deleteEdge: (flowId: string, edgeId: string) => Promise<void>;

  submitForReview: (flowId: string) => Promise<void>;
  reviewFlow: (flowId: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>;
  reviewNode: (flowId: string, nodeId: string, decision: 'approved' | 'rejected' | 'comment', comment?: string) => Promise<void>;

  reset: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flow: null,
  rfNodes: [],
  rfEdges: [],
  selectedNodeId: null,
  loading: false,
  error: null,

  loadFlow: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await flowsApi.get(id);
      set({
        flow: data,
        rfNodes: data.nodes?.map(toRFNode) ?? [],
        rfEdges: data.edges?.map(toRFEdge) ?? [],
        loading: false,
      });
    } catch {
      set({ error: 'Failed to load flow', loading: false });
    }
  },

  setRfNodes: nodes => set({ rfNodes: nodes }),
  setRfEdges: edges => set({ rfEdges: edges }),
  setSelectedNode: id => set({ selectedNodeId: id }),

  addNode: async (flowId, nodeType, position) => {
    const serverNode = await flowsApi.createNode(flowId, {
      nodeType,
      positionX: position.x,
      positionY: position.y,
      color: nodeTypeColors[nodeType],
    });
    set(s => ({ rfNodes: [...s.rfNodes, toRFNode(serverNode)] }));
  },

  updateNode: async (flowId, nodeId, data) => {
    const serverNode = await flowsApi.updateNode(flowId, nodeId, data as Parameters<typeof flowsApi.updateNode>[2]);
    set(s => ({
      rfNodes: s.rfNodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...serverNode.data } } : n
      ),
    }));
  },

  updatePositions: async (flowId, positions) => {
    await flowsApi.updatePositions(flowId, positions);
  },

  deleteNode: async (flowId, nodeId) => {
    await flowsApi.deleteNode(flowId, nodeId);
    set(s => ({
      rfNodes: s.rfNodes.filter(n => n.id !== nodeId),
      rfEdges: s.rfEdges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
    }));
  },

  addEdge: async (flowId, connection) => {
    const serverEdge = await flowsApi.createEdge(flowId, {
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    });
    set(s => ({ rfEdges: [...s.rfEdges, toRFEdge(serverEdge)] }));
  },

  deleteEdge: async (flowId, edgeId) => {
    await flowsApi.deleteEdge(flowId, edgeId);
    set(s => ({ rfEdges: s.rfEdges.filter(e => e.id !== edgeId) }));
  },

  submitForReview: async (flowId) => {
    const updated = await flowsApi.submit(flowId);
    set(s => ({ flow: s.flow ? { ...s.flow, ...updated } : null }));
  },

  reviewFlow: async (flowId, decision, comment) => {
    const updated = await flowsApi.review(flowId, { decision, comment });
    set(s => ({ flow: s.flow ? { ...s.flow, ...updated } : null }));
  },

  reviewNode: async (flowId, nodeId, decision, comment) => {
    await flowsApi.reviewNode(flowId, nodeId, { decision, comment });
    set(s => ({
      rfNodes: s.rfNodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, reviewDecision: decision, reviewComment: comment ?? null } } : n
      ),
    }));
  },

  reset: () => set({ flow: null, rfNodes: [], rfEdges: [], selectedNodeId: null, loading: false, error: null }),
}));
