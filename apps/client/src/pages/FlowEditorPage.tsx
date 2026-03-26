import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionMode,
  type Connection,
  type NodeTypes,
  type Node as RFNode,
  type Edge as RFEdge,
  type ReactFlowInstance,
  type OnEdgeUpdateFunc,
} from 'reactflow';
import { useFlowStore } from '../store/flow';
import { useAuthStore } from '../store/auth';
import { flowsApi } from '../api/flows';
import type { NodeData, NodeType } from '@process-flow/shared';
import ProcessNode from '../components/ProcessNode';
import NodePalette from '../components/NodePalette';
import NodeDetailPanel from '../components/NodeDetailPanel';
import FlowHistory from '../components/FlowHistory';

const nodeTypes: NodeTypes = { processNode: ProcessNode };

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
};

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const {
    flow, rfNodes, rfEdges, selectedNodeId, loading,
    loadFlow, setRfNodes, setRfEdges, setSelectedNode,
    addNode, addEdge, deleteNode, deleteEdge, updatePositions,
    submitForReview, reviewFlow, reset,
  } = useFlowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const edgeUpdateSuccessful = useRef(true);

  useEffect(() => {
    if (id) loadFlow(id);
    return () => reset();
  }, [id]);

  // Sync store → RF state, preserving current position and style (resize dimensions)
  // of existing nodes so that adding a new node doesn't reposition or un-resize others.
  useEffect(() => {
    setNodes(current => {
      const byId = new Map(current.map(n => [n.id, n]));
      return rfNodes.map(n => {
        const existing = byId.get(n.id);
        return existing ? { ...n, position: existing.position, style: existing.style } : n;
      });
    });
  }, [rfNodes]);

  useEffect(() => { setEdges(rfEdges); }, [rfEdges]);

  const onConnect = useCallback((connection: Connection) => {
    if (!id || !connection.source || !connection.target) return;
    addEdge(id, {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });
  }, [id, addEdge]);

  const onNodeDragStop = useCallback((_: unknown, node: RFNode) => {
    if (!id) return;
    updatePositions(id, [{ id: node.id, positionX: node.position.x, positionY: node.position.y }]);
  }, [id, updatePositions]);

  const onNodeClick = useCallback((_: unknown, node: RFNode) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onEdgesDelete = useCallback((deleted: RFEdge[]) => {
    if (!id) return;
    deleted.forEach(e => deleteEdge(id, e.id));
  }, [id, deleteEdge]);

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate: OnEdgeUpdateFunc = useCallback(async (oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true;
    if (!id || !newConnection.source || !newConnection.target) return;
    await deleteEdge(id, oldEdge.id);
    await addEdge(id, {
      source: newConnection.source,
      target: newConnection.target,
      sourceHandle: newConnection.sourceHandle,
      targetHandle: newConnection.targetHandle,
    });
  }, [id, deleteEdge, addEdge]);

  const onEdgeUpdateEnd = useCallback((_: unknown, edge: RFEdge) => {
    if (!edgeUpdateSuccessful.current && id) {
      deleteEdge(id, edge.id);
    }
    edgeUpdateSuccessful.current = true;
  }, [id, deleteEdge]);

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    if (!id) return;
    deleted.forEach(n => deleteNode(id, n.id));
  }, [id, deleteNode]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('application/nodeType') as NodeType;
    if (!nodeType || !rfInstance || !reactFlowWrapper.current || !id) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.project({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
    addNode(id, nodeType, position);
  }, [rfInstance, id, addNode]);

  const handleSubmit = async () => {
    if (!id) return;
    await submitForReview(id);
  };

  const handleReview = async () => {
    if (!id) return;
    await reviewFlow(id, reviewDecision, reviewComment || undefined);
    setShowReviewModal(false);
  };

  const isDraft = flow?.status === 'draft';
  const isRejected = flow?.status === 'rejected';
  const isEditable = isDraft || isRejected;
  const isInReview = flow?.status === 'in_review';
  const isBA = user?.role === 'ba';
  const isReviewer = user?.role === 'reviewer';

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">Loading...</div>
    );
  }

  if (!flow) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">
        Flow not found. <button onClick={() => navigate('/')} className="underline ml-1">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{flow.title}</h1>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[flow.status]}`}>
          {statusLabel[flow.status]}
        </span>

        <div className="flex items-center gap-2">
          {/* History */}
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`text-sm border rounded-lg px-3 py-1.5 ${
              showHistory
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            History
          </button>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExport(v => !v)}
              className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              Export
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-52 p-2">
                {(['pdf', 'docx', 'markdown'] as const).map(fmt =>
                  (['requirements', 'data_dictionary'] as const).map(type => (
                    <a
                      key={`${fmt}-${type}`}
                      href={flowsApi.exportUrl(flow.id, fmt, type)}
                      download
                      onClick={() => setShowExport(false)}
                      className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      {fmt.toUpperCase()} · {type === 'requirements' ? 'Requirements' : 'Data Dictionary'}
                    </a>
                  ))
                )}
              </div>
            )}
          </div>

          {/* BA: submit / resubmit */}
          {isBA && isEditable && (
            <button
              onClick={handleSubmit}
              className="bg-amber-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-amber-600"
            >
              {isRejected ? 'Resubmit for Review' : 'Submit for Review'}
            </button>
          )}

          {/* Reviewer: approve/reject */}
          {isReviewer && isInReview && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-indigo-700"
            >
              Review Flow
            </button>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node palette — BA on editable flows */}
        {isBA && isEditable && <NodePalette />}

        {/* ReactFlow canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={onNodesDelete}
            onEdgeUpdate={isEditable ? onEdgeUpdate : undefined}
            onEdgeUpdateStart={isEditable ? onEdgeUpdateStart : undefined}
            onEdgeUpdateEnd={isEditable ? onEdgeUpdateEnd : undefined}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={instance => setRfInstance(instance)}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            deleteKeyCode="Delete"
            connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
            defaultEdgeOptions={defaultEdgeOptions}
          >
            <Background color="#e2e8f0" />
            <Controls />
            <MiniMap nodeColor={n => (n.data as NodeData)?.color ?? '#6366f1'} />
          </ReactFlow>

          {isBA && isEditable && nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Drag node types from the left panel onto the canvas</p>
            </div>
          )}
        </div>

        {/* Node detail panel */}
        {selectedNodeId && (
          <NodeDetailPanel
            flowId={flow.id}
            nodeId={selectedNodeId}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {/* History panel */}
        {showHistory && (
          <FlowHistory flowId={flow.id} onClose={() => setShowHistory(false)} />
        )}
      </div>

      {/* Flow review modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-1">Review Flow</h2>
            <p className="text-sm text-gray-500 mb-4">"{flow.title}"</p>

            <div className="flex gap-3 mb-4">
              {(['approved', 'rejected'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setReviewDecision(d)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border-2 transition-colors ${
                    reviewDecision === d
                      ? d === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {d === 'approved' ? 'Approve' : 'Reject'}
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Optional comment..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={handleReview}
                className={`flex-1 text-white rounded-lg px-4 py-2 text-sm font-medium ${
                  reviewDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {reviewDecision === 'approved' ? 'Approval' : 'Rejection'}
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
