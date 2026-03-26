import { api } from './client';
import type {
  Flow,
  FlowNode,
  FlowEdge,
  CreateFlowInput,
  UpdateFlowInput,
  CreateNodeInput,
  UpdateNodeInput,
  CreateEdgeInput,
  CreateFlowReviewInput,
  CreateReviewInput,
  DocumentFormat,
  DocumentType,
} from '@process-flow/shared';

export const flowsApi = {
  list: () => api.get('flows').json<Flow[]>(),
  get: (id: string) => api.get(`flows/${id}`).json<Flow & { nodes: FlowNode[]; edges: FlowEdge[] }>(),
  create: (data: CreateFlowInput) => api.post('flows', { json: data }).json<Flow>(),
  update: (id: string, data: UpdateFlowInput) => api.put(`flows/${id}`, { json: data }).json<Flow>(),
  delete: (id: string) => api.delete(`flows/${id}`),
  submit: (id: string) => api.post(`flows/${id}/submit`).json<Flow>(),
  review: (id: string, data: CreateFlowReviewInput) =>
    api.post(`flows/${id}/review`, { json: data }).json<Flow>(),

  createNode: (flowId: string, data: CreateNodeInput) =>
    api.post(`flows/${flowId}/nodes`, { json: data }).json<FlowNode>(),
  updateNode: (flowId: string, nodeId: string, data: UpdateNodeInput) =>
    api.put(`flows/${flowId}/nodes/${nodeId}`, { json: data }).json<FlowNode>(),
  updatePositions: (flowId: string, positions: Array<{ id: string; positionX: number; positionY: number }>) =>
    api.patch(`flows/${flowId}/nodes/positions`, { json: positions }).json<{ ok: boolean }>(),
  deleteNode: (flowId: string, nodeId: string) => api.delete(`flows/${flowId}/nodes/${nodeId}`),
  reviewNode: (flowId: string, nodeId: string, data: CreateReviewInput) =>
    api.post(`flows/${flowId}/nodes/${nodeId}/review`, { json: data }).json<{ ok: boolean }>(),

  createEdge: (flowId: string, data: CreateEdgeInput) =>
    api.post(`flows/${flowId}/edges`, { json: data }).json<FlowEdge>(),
  updateEdge: (flowId: string, edgeId: string, label: string) =>
    api.put(`flows/${flowId}/edges/${edgeId}`, { json: { label } }).json<{ ok: boolean }>(),
  deleteEdge: (flowId: string, edgeId: string) => api.delete(`flows/${flowId}/edges/${edgeId}`),

  exportUrl: (flowId: string, format: DocumentFormat, type: DocumentType) =>
    `/api/flows/${flowId}/export?format=${format}&type=${type}`,
};
