import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['ba', 'reviewer'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const flows = sqliteTable('flows', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'in_review', 'approved', 'rejected'] })
    .notNull()
    .default('draft'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  reviewComment: text('review_comment'),
  reviewedBy: text('reviewed_by'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const flowNodes = sqliteTable('flow_nodes', {
  id: text('id').primaryKey(),
  flowId: text('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  stepId: text('step_id').notNull().default(''),
  nodeType: text('node_type', {
    enum: ['process', 'decision', 'delay', 'start', 'end'],
  }).notNull(),
  pithyLabel: text('pithy_label').notNull().default(''),
  color: text('color').notNull().default('#6366f1'),
  actor: text('actor').notNull().default(''),
  actionDescription: text('action_description').notNull().default(''),
  businessRules: text('business_rules').notNull().default('[]'),
  timingConstraints: text('timing_constraints').notNull().default(''),
  documentsUsed: text('documents_used').notNull().default('[]'),
  dataFields: text('data_fields').notNull().default('[]'),
  systemsUsed: text('systems_used').notNull().default('[]'),
  processStatus: text('process_status').notNull().default(''),
  processSubstatus: text('process_substatus').notNull().default(''),
  nextActor: text('next_actor').notNull().default(''),
  width: real('width'),
  height: real('height'),
  reviewDecision: text('review_decision', {
    enum: ['approved', 'rejected', 'comment'],
  }),
  reviewComment: text('review_comment'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const flowEdges = sqliteTable('flow_edges', {
  id: text('id').primaryKey(),
  flowId: text('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  sourceNodeId: text('source_node_id').notNull(),
  targetNodeId: text('target_node_id').notNull(),
  label: text('label'),
  sourceHandle: text('source_handle'),
  targetHandle: text('target_handle'),
  createdAt: integer('created_at').notNull(),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  flowId: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  nodeId: text('node_id').references(() => flowNodes.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const flowEvents = sqliteTable('flow_events', {
  id: text('id').primaryKey(),
  flowId: text('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  eventType: text('event_type', {
    enum: ['created', 'submitted', 'approved', 'rejected', 'revised'],
  }).notNull(),
  actorId: text('actor_id').notNull(),
  actorUsername: text('actor_username').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
});
