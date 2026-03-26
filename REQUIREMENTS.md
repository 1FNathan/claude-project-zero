# Process Flow — Requirements Document

**Version:** 1.1
**Last Updated:** 2026-03-26
**Project:** Process Flow — Business Process Documentation & Review Tool

---

## 1. Overview

Process Flow is a web-based application that enables Business Analysts (BAs) to create, document, and publish visual process flow diagrams. Reviewers can examine submitted flows and approve or reject them. All flows have a complete audit trail.

---

## 2. User Roles

| Role | Description |
|---|---|
| **BA (Business Analyst)** | Creates and edits process flows. Submits flows for review. Revises rejected flows and resubmits. |
| **Reviewer** | Views all flows. Approves or rejects flows (with optional comments). Can leave per-node review decisions. |

---

## 3. Authentication

- Username/password login with JWT-based session tokens (7-day expiry).
- Role is embedded in the token and enforced on every API route.
- Seeded credentials for development: `ba_user / password123`, `reviewer_user / password123`.

---

## 4. Flow Lifecycle

### 4.1 Statuses

```
Draft ──► In Review ──► Approved
                   └──► Rejected ──► (BA edits) ──► In Review (Revision)
```

| Status | Description |
|---|---|
| `draft` | BA is building / editing the flow |
| `in_review` | Submitted; reviewer is evaluating |
| `approved` | Reviewer approved |
| `rejected` | Reviewer rejected; BA may revise and resubmit |

### 4.2 Transitions

- **BA** submits from `draft` → `in_review`
- **BA** resubmits from `rejected` → `in_review` (recorded as a *Revision* event)
- **Reviewer** approves: `in_review` → `approved`
- **Reviewer** rejects: `in_review` → `rejected`
- Node-level review decisions are cleared when a BA resubmits after rejection, so the reviewer sees a clean pass.

### 4.3 Editing Rules

| Action | Allowed Statuses |
|---|---|
| Edit flow metadata | `draft`, `rejected` |
| Add / edit / delete nodes | `draft`, `rejected` |
| Add / edit / delete edges | `draft`, `rejected` |
| Reposition nodes | `draft`, `rejected` |

---

## 5. Flow Editor

### 5.1 Canvas

- Visual drag-and-drop editor powered by ReactFlow.
- BA can drag node types from the left palette onto the canvas.
- Nodes can be freely repositioned by dragging; positions are persisted.
- Adding a new node must **not** reposition any previously placed nodes.
- Edges are deleted via the Delete key after selection.
- Canvas includes: Background grid, Zoom controls, Mini-map.

### 5.2 Connections (Edges)

- **Arrowheads** on all edges indicating direction of flow.
- Every node exposes connection handles on **all four sides** (top, right, bottom, left).
- Any side can be the source or target of a connection (`ConnectionMode.Loose`).
- Edge style: smooth-step with slate-gray stroke and closed arrowhead.

---

## 6. Node Types & Shapes

| Type | Shape | Default Color | Notes |
|---|---|---|---|
| **Process** | Rectangle (rounded corners) | Indigo `#6366f1` | Standard process step |
| **Decision** | Diamond | Amber `#f59e0b` | Right handle = Yes (green), Left handle = No (red) |
| **Delay** | D-shape (straight left, rounded right) | Purple `#8b5cf6` | Indicates waiting / delay |
| **Start** | Pill / oval | Green `#10b981` | Entry point of the flow |
| **End** | Pill / oval | Red `#ef4444` | Exit point of the flow |

Each node displays:
- Type badge (colored label)
- Pithy label (or Step ID in italic if no label set)
- Actor (if populated)
- Review decision indicator (if reviewer has marked the node)

---

## 7. Node Metadata Fields

Each node stores the following properties, editable in the Node Detail Panel:

| Field | Type | Description |
|---|---|---|
| `stepId` | String (auto) | Auto-assigned step identifier (S1, S2, …) |
| `pithyLabel` | String | Short display label shown on the canvas node |
| `color` | Hex color | Visual color of the node border and badge |
| `actor` | String | Who performs this step |
| `actionDescription` | Text | Full description of the action |
| `businessRules` | Text | Applicable business rules |
| `timingConstraints` | Text | SLA / timing requirements |
| `documentsUsed` | String[] | List of documents referenced |
| `dataFields` | DataField[] | Structured data fields (key, label, type, value) |
| `systemsUsed` | String[] | Systems / applications involved |
| `processStatus` | String | Status of the process at this step |
| `processSubstatus` | String | Sub-status detail |
| `nextActor` | String | Who receives the work next |

---

## 8. Node-Level Review

- When a flow is `in_review`, a Reviewer may set a per-node decision: `approved`, `rejected`, or `comment`.
- Node review decisions are shown as a colored indicator on the canvas node.
- All node review decisions are cleared when the BA resubmits a revision.

---

## 9. Audit Trail / History

Every flow maintains a chronological event log:

| Event Type | Triggered By | When |
|---|---|---|
| `created` | BA | Flow is first created |
| `submitted` | BA | First submission for review |
| `approved` | Reviewer | Flow is approved |
| `rejected` | Reviewer | Flow is rejected |
| `revised` | BA | Resubmission after a rejection |

Each event records: event type, actor username, timestamp, and optional notes/comments.

The **History panel** (accessible via the "History" button in the editor header) displays the full event timeline as a vertical list with colored badges and timestamps.

---

## 10. Export

Flows can be exported in three formats and two document types:

| Format | Types |
|---|---|
| PDF | Requirements Doc, Data Dictionary |
| DOCX | Requirements Doc, Data Dictionary |
| Markdown | Requirements Doc, Data Dictionary |

Export is available to all authenticated users from the editor header.

---

## 11. Dashboard

- BA: sees only their own flows.
- Reviewer: sees all flows.
- Flows are listed with title, status badge, and creation date.
- BA has a "New Flow" button to create a flow with a title and optional description.

---

## 12. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Visual Editor | ReactFlow v11 |
| State Management | Zustand |
| HTTP Client | ky |
| Backend | Node.js 24, Express 5, TypeScript |
| ORM | Drizzle ORM |
| Database | SQLite (via @libsql/client) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Monorepo | pnpm workspaces |
| Shared Types | `@process-flow/shared` package |

---

## 13. Non-Functional Requirements

- The app should run fully locally (no cloud dependencies in development).
- The client dev server should be accessible on the local network (Vite `host: true`).
- The server runs on port 3001; the client dev server on port 5173 with `/api` proxied to the server.
- The `.claude/` directory is never committed.
- Commit and push after every meaningful unit of work.
