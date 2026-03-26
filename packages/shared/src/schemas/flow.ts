import { z } from 'zod';

export const DataFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date']),
  value: z.string(),
});

export const CreateFlowSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const UpdateFlowSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'rejected']).optional(),
});

export const CreateNodeSchema = z.object({
  nodeType: z.enum(['process', 'decision', 'delay', 'start', 'end']),
  positionX: z.number(),
  positionY: z.number(),
  pithyLabel: z.string().max(100).default(''),
  color: z.string().default('#6366f1'),
});

export const UpdateNodeSchema = z.object({
  pithyLabel: z.string().max(100).optional(),
  color: z.string().optional(),
  actor: z.string().max(200).optional(),
  actionDescription: z.string().optional(),
  businessRules: z.string().optional(),
  timingConstraints: z.string().optional(),
  documentsUsed: z.array(z.string()).optional(),
  dataFields: z.array(DataFieldSchema).optional(),
  systemsUsed: z.array(z.string()).optional(),
  processStatus: z.string().max(200).optional(),
  processSubstatus: z.string().max(200).optional(),
  nextActor: z.string().max(200).optional(),
});

export const UpdateNodePositionsSchema = z.array(z.object({
  id: z.string(),
  positionX: z.number(),
  positionY: z.number(),
}));

export const CreateEdgeSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().max(200).optional(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const UpdateEdgeSchema = z.object({
  label: z.string().max(200).optional(),
});

export const CreateReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'comment']),
  comment: z.string().max(2000).optional(),
});

export const CreateFlowReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().max(2000).optional(),
});

export const DocumentRequestSchema = z.object({
  format: z.enum(['pdf', 'docx', 'markdown']),
  type: z.enum(['requirements', 'data_dictionary']),
});

export type CreateFlowInput = z.infer<typeof CreateFlowSchema>;
export type UpdateFlowInput = z.infer<typeof UpdateFlowSchema>;
export type CreateNodeInput = z.infer<typeof CreateNodeSchema>;
export type UpdateNodeInput = z.infer<typeof UpdateNodeSchema>;
export type CreateEdgeInput = z.infer<typeof CreateEdgeSchema>;
export type UpdateEdgeInput = z.infer<typeof UpdateEdgeSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type CreateFlowReviewInput = z.infer<typeof CreateFlowReviewSchema>;
export type DocumentRequestInput = z.infer<typeof DocumentRequestSchema>;
