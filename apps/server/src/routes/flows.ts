import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/connection.js';
import { flows, flowNodes, flowEdges } from '../db/schema.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';
import { CreateFlowSchema, UpdateFlowSchema, CreateFlowReviewSchema } from '@process-flow/shared';

export const flowsRouter = Router();
flowsRouter.use(authenticate);

function serializeNode(node: typeof flowNodes.$inferSelect) {
  return {
    id: node.id,
    flowId: node.flowId,
    positionX: node.positionX,
    positionY: node.positionY,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    data: {
      stepId: node.stepId,
      nodeType: node.nodeType,
      pithyLabel: node.pithyLabel,
      color: node.color,
      actor: node.actor,
      actionDescription: node.actionDescription,
      businessRules: node.businessRules,
      timingConstraints: node.timingConstraints,
      documentsUsed: JSON.parse(node.documentsUsed) as string[],
      dataFields: JSON.parse(node.dataFields) as unknown[],
      systemsUsed: JSON.parse(node.systemsUsed) as string[],
      processStatus: node.processStatus,
      processSubstatus: node.processSubstatus,
      nextActor: node.nextActor,
      reviewDecision: node.reviewDecision ?? null,
      reviewComment: node.reviewComment ?? null,
    },
  };
}

// GET /api/flows
flowsRouter.get('/', async (req: AuthRequest, res) => {
  const user = req.user!;
  const result = user.role === 'reviewer'
    ? await db.select().from(flows)
    : await db.select().from(flows).where(eq(flows.createdBy, user.sub));
  res.json(result);
});

// POST /api/flows
flowsRouter.post('/', requireRole('ba'), async (req: AuthRequest, res) => {
  const result = CreateFlowSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const now = Date.now();
  const flow = {
    id: randomUUID(),
    title: result.data.title,
    description: result.data.description ?? null,
    status: 'draft' as const,
    createdBy: req.user!.sub,
    reviewComment: null,
    reviewedBy: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(flows).values(flow);
  res.status(201).json(flow);
});

// GET /api/flows/:id
flowsRouter.get('/:id', async (req: AuthRequest, res) => {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.id) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role === 'ba' && flow.createdBy !== req.user!.sub) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const nodes = await db.select().from(flowNodes).where(eq(flowNodes.flowId, flow.id));
  const edges = await db.select().from(flowEdges).where(eq(flowEdges.flowId, flow.id));
  res.json({ ...flow, nodes: nodes.map(serializeNode), edges });
});

// PUT /api/flows/:id
flowsRouter.put('/:id', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.id) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.createdBy !== req.user!.sub) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (flow.status !== 'draft') { res.status(400).json({ error: 'Can only edit draft flows' }); return; }

  const result = UpdateFlowSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const updated = { ...result.data, updatedAt: Date.now() };
  await db.update(flows).set(updated).where(eq(flows.id, req.params.id));
  res.json({ ...flow, ...updated });
});

// DELETE /api/flows/:id
flowsRouter.delete('/:id', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.id) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.createdBy !== req.user!.sub) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (flow.status !== 'draft') { res.status(400).json({ error: 'Can only delete draft flows' }); return; }
  await db.delete(flows).where(eq(flows.id, req.params.id));
  res.status(204).end();
});

// POST /api/flows/:id/submit
flowsRouter.post('/:id/submit', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.id) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.createdBy !== req.user!.sub) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (flow.status !== 'draft') { res.status(400).json({ error: 'Flow must be in draft to submit' }); return; }

  const updatedAt = Date.now();
  await db.update(flows).set({ status: 'in_review', updatedAt }).where(eq(flows.id, req.params.id));
  res.json({ ...flow, status: 'in_review', updatedAt });
});

// POST /api/flows/:id/review
flowsRouter.post('/:id/review', requireRole('reviewer'), async (req: AuthRequest, res) => {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.id) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.status !== 'in_review') { res.status(400).json({ error: 'Flow must be in review' }); return; }

  const result = CreateFlowReviewSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const newStatus = result.data.decision === 'approved' ? 'approved' : 'rejected';
  const updatedAt = Date.now();
  await db.update(flows).set({
    status: newStatus,
    reviewComment: result.data.comment ?? null,
    reviewedBy: req.user!.sub,
    updatedAt,
  }).where(eq(flows.id, req.params.id));
  res.json({ ...flow, status: newStatus, updatedAt });
});
