import { Router } from 'express';
import { eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { db } from '../db/connection.js';
import { flows, flowNodes } from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { DocumentRequestSchema } from '@process-flow/shared';

export const exportRouter = Router({ mergeParams: true });
exportRouter.use(authenticate);

interface DataField {
  key: string;
  label: string;
  type: string;
  value: string;
}

interface ParsedNode extends Omit<typeof flowNodes.$inferSelect, 'documentsUsed' | 'dataFields' | 'systemsUsed'> {
  documentsUsed: string[];
  dataFields: DataField[];
  systemsUsed: string[];
}

function requirementsMarkdown(flow: typeof flows.$inferSelect, nodes: ParsedNode[]): string {
  const lines: string[] = [
    `# Flow Requirements: ${flow.title}`,
    '',
    ...(flow.description ? [`**Description:** ${flow.description}`, ''] : []),
    `**Status:** ${flow.status}`,
    '',
    '## Process Steps',
    '',
  ];
  for (const node of nodes) {
    lines.push(`### ${node.stepId}: ${node.pithyLabel || node.nodeType}`);
    lines.push(`- **Type:** ${node.nodeType}`);
    if (node.actor) lines.push(`- **Actor:** ${node.actor}`);
    if (node.actionDescription) lines.push(`- **Action:** ${node.actionDescription}`);
    if (node.businessRules) lines.push(`- **Business Rules:** ${node.businessRules}`);
    if (node.timingConstraints) lines.push(`- **Timing:** ${node.timingConstraints}`);
    if (node.systemsUsed.length) lines.push(`- **Systems:** ${node.systemsUsed.join(', ')}`);
    if (node.documentsUsed.length) lines.push(`- **Documents:** ${node.documentsUsed.join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

function dataDictionaryMarkdown(flow: typeof flows.$inferSelect, nodes: ParsedNode[]): string {
  const lines: string[] = [
    `# Data Dictionary: ${flow.title}`,
    '',
    ...(flow.description ? [`**Description:** ${flow.description}`, ''] : []),
  ];
  for (const node of nodes) {
    if (!node.dataFields.length) continue;
    lines.push(`## ${node.stepId}: ${node.pithyLabel || node.nodeType}`);
    lines.push('');
    lines.push('| Key | Label | Type | Value |');
    lines.push('|-----|-------|------|-------|');
    for (const f of node.dataFields) {
      lines.push(`| ${f.key} | ${f.label} | ${f.type} | ${f.value} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function generatePDF(title: string, content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    for (const line of content.split('\n')) {
      if (line.startsWith('# ')) {
        doc.fontSize(20).font('Helvetica-Bold').text(line.slice(2));
        doc.moveDown(0.5);
      } else if (line.startsWith('## ')) {
        doc.fontSize(16).font('Helvetica-Bold').text(line.slice(3));
        doc.moveDown(0.3);
      } else if (line.startsWith('### ')) {
        doc.fontSize(13).font('Helvetica-Bold').text(line.slice(4));
        doc.moveDown(0.2);
      } else if (line.startsWith('- **') || line.startsWith('**')) {
        doc.fontSize(11).font('Helvetica').text(line.replace(/\*\*(.*?)\*\*/g, '$1'));
      } else if (line.startsWith('|')) {
        doc.fontSize(9).font('Courier').text(line);
      } else if (line.trim()) {
        doc.fontSize(11).font('Helvetica').text(line);
      } else {
        doc.moveDown(0.3);
      }
    }
    doc.end();
  });
}

async function generateDOCX(
  title: string,
  type: 'requirements' | 'data_dictionary',
  flow: typeof flows.$inferSelect,
  nodes: ParsedNode[]
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    ...(flow.description ? [new Paragraph({ children: [new TextRun({ text: `Description: ${flow.description}` })] })] : []),
    new Paragraph({ children: [new TextRun({ text: `Status: ${flow.status}` })] }),
    new Paragraph({}),
  ];

  if (type === 'requirements') {
    children.push(new Paragraph({ text: 'Process Steps', heading: HeadingLevel.HEADING_1 }));
    for (const node of nodes) {
      children.push(new Paragraph({ text: `${node.stepId}: ${node.pithyLabel || node.nodeType}`, heading: HeadingLevel.HEADING_2 }));
      const fields: [string, string][] = [
        ['Type', node.nodeType],
        ['Actor', node.actor],
        ['Action', node.actionDescription],
        ['Business Rules', node.businessRules],
        ['Timing Constraints', node.timingConstraints],
        ['Systems Used', node.systemsUsed.join(', ')],
        ['Documents Used', node.documentsUsed.join(', ')],
      ];
      for (const [label, value] of fields) {
        if (value) {
          children.push(new Paragraph({
            children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
          }));
        }
      }
      children.push(new Paragraph({}));
    }
  } else {
    for (const node of nodes) {
      if (!node.dataFields.length) continue;
      children.push(new Paragraph({ text: `${node.stepId}: ${node.pithyLabel || node.nodeType}`, heading: HeadingLevel.HEADING_2 }));
      for (const f of node.dataFields) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${f.key} (${f.label}): `, bold: true }),
            new TextRun({ text: `[${f.type}] ${f.value}` }),
          ],
        }));
      }
      children.push(new Paragraph({}));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// GET /api/flows/:flowId/export?format=pdf|docx|markdown&type=requirements|data_dictionary
exportRouter.get('/', async (req: AuthRequest, res) => {
  const result = DocumentRequestSchema.safeParse(req.query);
  if (!result.success) { res.status(400).json({ error: 'Invalid parameters. Use format= and type= query params.' }); return; }

  const { format, type } = result.data;
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, req.params.flowId) });
  if (!flow) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role === 'ba' && flow.createdBy !== req.user!.sub) { res.status(403).json({ error: 'Forbidden' }); return; }

  const rawNodes = await db.select().from(flowNodes).where(eq(flowNodes.flowId, flow.id));
  const nodes: ParsedNode[] = rawNodes.map(n => ({
    ...n,
    documentsUsed: JSON.parse(n.documentsUsed) as string[],
    dataFields: JSON.parse(n.dataFields) as DataField[],
    systemsUsed: JSON.parse(n.systemsUsed) as string[],
  }));

  const docTitle = type === 'requirements' ? `Requirements - ${flow.title}` : `Data Dictionary - ${flow.title}`;

  if (format === 'markdown') {
    const content = type === 'requirements' ? requirementsMarkdown(flow, nodes) : dataDictionaryMarkdown(flow, nodes);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${docTitle}.md"`);
    res.send(content);
    return;
  }

  if (format === 'pdf') {
    const md = type === 'requirements' ? requirementsMarkdown(flow, nodes) : dataDictionaryMarkdown(flow, nodes);
    const buffer = await generatePDF(docTitle, md);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${docTitle}.pdf"`);
    res.send(buffer);
    return;
  }

  if (format === 'docx') {
    const buffer = await generateDOCX(docTitle, type, flow, nodes);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${docTitle}.docx"`);
    res.send(buffer);
  }
});
