import { Router } from 'express';
import { eq, and, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/connection.js';
import { flows, flowNodes } from '../db/schema.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';
import {
  CreateNodeSchema,
  UpdateNodeSchema,
  UpdateNodePositionsSchema,
  CreateReviewSchema,
} from '@process-flow/shared';

export const nodesRouter = Router({ mergeParams: true });
nodesRouter.use(authenticate);

async function getFlow(flowId: string, userId: string, role: string) {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, flowId) });
  if (!flow) return null;
  if (role === 'ba' && flow.createdBy !== userId) return null;
  return flow;
}

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

// POST /api/flows/:flowId/nodes
nodesRouter.post('/', async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role === 'ba' && flow.status !== 'draft') {
    res.status(400).json({ error: 'Can only add nodes to draft flows' }); return;
  }

  const result = CreateNodeSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const [{ value: nodeCount }] = await db
    .select({ value: count() })
    .from(flowNodes)
    .where(eq(flowNodes.flowId, flow.id));
  const stepId = `S${Number(nodeCount) + 1}`;

  const now = Date.now();
  const node = {
    id: randomUUID(),
    flowId: flow.id,
    positionX: result.data.positionX,
    positionY: result.data.positionY,
    stepId,
    nodeType: result.data.nodeType,
    pithyLabel: result.data.pithyLabel,
    color: result.data.color,
    actor: '',
    actionDescription: '',
    businessRules: '',
    timingConstraints: '',
    documentsUsed: '[]',
    dataFields: '[]',
    systemsUsed: '[]',
    processStatus: '',
    processSubstatus: '',
    nextActor: '',
    reviewDecision: null,
    reviewComment: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(flowNodes).values(node);
  await db.update(flows).set({ updatedAt: now }).where(eq(flows.id, flow.id));
  res.status(201).json(serializeNode(node));
});

// PATCH /api/flows/:flowId/nodes/positions — must come before /:nodeId
nodesRouter.patch('/positions', async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role === 'ba' && flow.status !== 'draft') {
    res.status(400).json({ error: 'Can only reposition nodes on draft flows' }); return;
  }

  const result = UpdateNodePositionsSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const now = Date.now();
  for (const { id, positionX, positionY } of result.data) {
    await db.update(flowNodes)
      .set({ positionX, positionY, updatedAt: now })
      .where(and(eq(flowNodes.id, id), eq(flowNodes.flowId, flow.id)));
  }
  res.json({ ok: true });
});

// PUT /api/flows/:flowId/nodes/:nodeId
nodesRouter.put('/:nodeId', async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role === 'ba' && flow.status !== 'draft') {
    res.status(400).json({ error: 'Can only edit nodes on draft flows' }); return;
  }

  const result = UpdateNodeSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const node = await db.query.flowNodes.findFirst({
    where: and(eq(flowNodes.id, req.params.nodeId), eq(flowNodes.flowId, req.params.flowId)),
  });
  if (!node) { res.status(404).json({ error: 'Node not found' }); return; }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  const d = result.data;
  if (d.pithyLabel !== undefined) updates.pithyLabel = d.pithyLabel;
  if (d.color !== undefined) updates.color = d.color;
  if (d.actor !== undefined) updates.actor = d.actor;
  if (d.actionDescription !== undefined) updates.actionDescription = d.actionDescription;
  if (d.businessRules !== undefined) updates.businessRules = d.businessRules;
  if (d.timingConstraints !== undefined) updates.timingConstraints = d.timingConstraints;
  if (d.documentsUsed !== undefined) updates.documentsUsed = JSON.stringify(d.documentsUsed);
  if (d.dataFields !== undefined) updates.dataFields = JSON.stringify(d.dataFields);
  if (d.systemsUsed !== undefined) updates.systemsUsed = JSON.stringify(d.systemsUsed);
  if (d.processStatus !== undefined) updates.processStatus = d.processStatus;
  if (d.processSubstatus !== undefined) updates.processSubstatus = d.processSubstatus;
  if (d.nextActor !== undefined) updates.nextActor = d.nextActor;

  await db.update(flowNodes).set(updates).where(eq(flowNodes.id, node.id));
  await db.update(flows).set({ updatedAt: Date.now() }).where(eq(flows.id, flow.id));

  res.json(serializeNode({ ...node, ...(updates as Partial<typeof node>) }));
});

// DELETE /api/flows/:flowId/nodes/:nodeId
nodesRouter.delete('/:nodeId', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, 'ba');
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.status !== 'draft') { res.status(400).json({ error: 'Can only delete nodes on draft flows' }); return; }

  await db.delete(flowNodes).where(
    and(eq(flowNodes.id, req.params.nodeId), eq(flowNodes.flowId, req.params.flowId))
  );
  res.status(204).end();
});

// POST /api/flows/:flowId/nodes/:nodeId/review
nodesRouter.post('/:nodeId/review', requireRole('reviewer'), async (req: AuthRequest, res) => {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.flowId) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.status !== 'in_review') { res.status(400).json({ error: 'Flow must be in review' }); return; }

  const result = CreateReviewSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const node = await db.query.flowNodes.findFirst({
    where: and(eq(flowNodes.id, req.params.nodeId), eq(flowNodes.flowId, req.params.flowId)),
  });
  if (!node) { res.status(404).json({ error: 'Node not found' }); return; }

  await db.update(flowNodes)
    .set({ reviewDecision: result.data.decision, reviewComment: result.data.comment ?? null, updatedAt: Date.now() })
    .where(eq(flowNodes.id, node.id));
  res.json({ ok: true });
});
