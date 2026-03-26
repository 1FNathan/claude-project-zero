import type { NodeType, FlowStatus, ReviewDecision } from './roles.js';

export interface DataField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  value: string;
}

export interface NodeData {
  stepId: string;
  nodeType: NodeType;
  pithyLabel: string;
  color: string;
  actor: string;
  actionDescription: string;
  businessRules: string;
  timingConstraints: string;
  documentsUsed: string[];
  dataFields: DataField[];
  systemsUsed: string[];
  processStatus: string;
  processSubstatus: string;
  nextActor: string;
  reviewDecision?: ReviewDecision | null;
  reviewComment?: string | null;
}

export interface FlowNode {
  id: string;
  flowId: string;
  positionX: number;
  positionY: number;
  data: NodeData;
  createdAt: number;
  updatedAt: number;
}

export interface FlowEdge {
  id: string;
  flowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  createdAt: number;
}

export interface Flow {
  id: string;
  title: string;
  description?: string | null;
  status: FlowStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

export interface User {
  id: string;
  username: string;
  role: import('./roles.js').Role;
}

export interface TokenPayload {
  sub: string;
  username: string;
  role: import('./roles.js').Role;
}

export interface FlowEvent {
  id: string;
  flowId: string;
  eventType: 'created' | 'submitted' | 'approved' | 'rejected' | 'revised';
  actorId: string;
  actorUsername: string;
  notes?: string | null;
  createdAt: number;
}
