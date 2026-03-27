import { Router } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/connection.js';
import { flows, flowNodes, attachments } from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../data/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, _file, cb) => cb(null, randomUUID()),
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export const attachmentsRouter = Router({ mergeParams: true });
attachmentsRouter.use(authenticate);

async function getFlow(flowId: string, userId: string, role: string) {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, flowId) });
  if (!flow) return null;
  if (role === 'ba' && flow.createdBy !== userId) return null;
  return flow;
}

// GET /api/flows/:flowId/attachments?nodeId=xxx  (omit nodeId for flow-level)
attachmentsRouter.get('/', async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }

  const nodeId = req.query.nodeId as string | undefined;
  const where = nodeId
    ? and(eq(attachments.flowId, req.params.flowId), eq(attachments.nodeId, nodeId))
    : and(eq(attachments.flowId, req.params.flowId), isNull(attachments.nodeId));

  const results = await db.select().from(attachments).where(where);
  res.json(results);
});

// POST /api/flows/:flowId/attachments?nodeId=xxx
attachmentsRouter.post('/', upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) {
    fs.unlinkSync(req.file.path);
    res.status(404).json({ error: 'Not found' }); return;
  }

  const nodeId = (req.query.nodeId as string) || null;
  if (nodeId) {
    const node = await db.query.flowNodes.findFirst({
      where: and(eq(flowNodes.id, nodeId), eq(flowNodes.flowId, req.params.flowId)),
    });
    if (!node) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: 'Node not found' }); return;
    }
  }

  const attachment = {
    id: randomUUID(),
    flowId: req.params.flowId,
    nodeId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user!.sub,
    createdAt: Date.now(),
  };

  await db.insert(attachments).values(attachment);
  res.status(201).json(attachment);
});

// GET /api/flows/:flowId/attachments/:attachmentId/download
attachmentsRouter.get('/:attachmentId/download', async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }

  const attachment = await db.query.attachments.findFirst({
    where: and(eq(attachments.id, req.params.attachmentId), eq(attachments.flowId, req.params.flowId)),
  });
  if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }

  const filePath = path.join(uploadDir, attachment.filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File missing from disk' }); return; }

  res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
  res.setHeader('Content-Type', attachment.mimeType);
  res.sendFile(filePath);
});

// DELETE /api/flows/:flowId/attachments/:attachmentId
attachmentsRouter.delete('/:attachmentId', async (req: AuthRequest, res) => {
  const flow = await getFlow(req.params.flowId, req.user!.sub, req.user!.role);
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }

  const attachment = await db.query.attachments.findFirst({
    where: and(eq(attachments.id, req.params.attachmentId), eq(attachments.flowId, req.params.flowId)),
  });
  if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }

  const filePath = path.join(uploadDir, attachment.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.delete(attachments).where(eq(attachments.id, req.params.attachmentId));
  res.status(204).end();
});
