import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/connection.js';
import { flows, flowEdges } from '../db/schema.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';
import { CreateEdgeSchema, UpdateEdgeSchema } from '@process-flow/shared';

export const edgesRouter = Router({ mergeParams: true });
edgesRouter.use(authenticate);

async function getEditableFlow(flowId: string, userId: string) {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, flowId) });
  if (!flow || flow.createdBy !== userId) return null;
  return flow;
}

// POST /api/flows/:flowId/edges
edgesRouter.post('/', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await getEditableFlow(req.params.flowId, req.user!.sub);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.status !== 'draft' && flow.status !== 'rejected') { res.status(400).json({ error: 'Can only add edges to draft or rejected flows' }); return; }

  const result = CreateEdgeSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const now = Date.now();
  const edge = {
    id: randomUUID(),
    flowId: flow.id,
    sourceNodeId: result.data.sourceNodeId,
    targetNodeId: result.data.targetNodeId,
    label: result.data.label ?? null,
    sourceHandle: result.data.sourceHandle ?? null,
    targetHandle: result.data.targetHandle ?? null,
    createdAt: now,
  };

  await db.insert(flowEdges).values(edge);
  await db.update(flows).set({ updatedAt: now }).where(eq(flows.id, flow.id));
  res.status(201).json(edge);
});

// PUT /api/flows/:flowId/edges/:edgeId
edgesRouter.put('/:edgeId', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await getEditableFlow(req.params.flowId, req.user!.sub);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.status !== 'draft' && flow.status !== 'rejected') { res.status(400).json({ error: 'Can only edit edges on draft or rejected flows' }); return; }

  const result = UpdateEdgeSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  await db.update(flowEdges)
    .set({ label: result.data.label ?? null })
    .where(and(eq(flowEdges.id, req.params.edgeId), eq(flowEdges.flowId, req.params.flowId)));
  res.json({ ok: true });
});

// DELETE /api/flows/:flowId/edges/:edgeId
edgesRouter.delete('/:edgeId', requireRole('ba'), async (req: AuthRequest, res) => {
  const flow = await getEditableFlow(req.params.flowId, req.user!.sub);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (flow.status !== 'draft' && flow.status !== 'rejected') { res.status(400).json({ error: 'Can only delete edges on draft or rejected flows' }); return; }

  await db.delete(flowEdges).where(
    and(eq(flowEdges.id, req.params.edgeId), eq(flowEdges.flowId, req.params.flowId))
  );
  res.status(204).end();
});
