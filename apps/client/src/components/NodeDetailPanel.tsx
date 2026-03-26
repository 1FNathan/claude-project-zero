import { useEffect, useState } from 'react';
import type { NodeData, DataField, BusinessRule } from '@process-flow/shared';
import { useFlowStore } from '../store/flow';
import { useAuthStore } from '../store/auth';

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface Props {
  flowId: string;
  nodeId: string;
  onClose: () => void;
}

export default function NodeDetailPanel({ flowId, nodeId, onClose }: Props) {
  const user = useAuthStore(s => s.user);
  const { rfNodes, rfEdges, flow, updateNode, reviewNode } = useFlowStore();
  const node = rfNodes.find(n => n.id === nodeId);

  const [form, setForm] = useState<Partial<NodeData>>({});
  const [saving, setSaving] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [newSystem, setNewSystem] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [newRule, setNewRule] = useState('');

  useEffect(() => {
    if (node) setForm({ ...node.data });
  }, [nodeId]);

  if (!node || !flow) return null;

  const isEditable = flow.status === 'draft' || flow.status === 'rejected';
  const isInReview = flow.status === 'in_review';
  const isBA = user?.role === 'ba';
  const isReviewer = user?.role === 'reviewer';
  const canEdit = isBA && isEditable;
  const canReview = isReviewer && isInReview;

  // Derive next actor from outgoing edges — not manually editable
  const derivedNextActor = rfEdges
    .filter(e => e.source === nodeId)
    .map(e => rfNodes.find(n => n.id === e.target)?.data.actor)
    .filter((a): a is string => Boolean(a))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');

  const set = (key: keyof NodeData, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNode(flowId, nodeId, { ...form, nextActor: derivedNextActor } as Partial<NodeData>);
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (decision: 'approved' | 'rejected' | 'comment') => {
    await reviewNode(flowId, nodeId, decision, reviewComment || undefined);
  };

  const addDataField = () => {
    const field: DataField = { key: newId(), label: 'New field', type: 'string', value: '' };
    set('dataFields', [...(form.dataFields ?? []), field]);
  };

  const updateDataField = (idx: number, patch: Partial<DataField>) => {
    const fields = [...(form.dataFields ?? [])];
    fields[idx] = { ...fields[idx], ...patch };
    set('dataFields', fields);
  };

  const removeDataField = (idx: number) => {
    set('dataFields', (form.dataFields ?? []).filter((_, i) => i !== idx));
  };

  const addSystem = () => {
    if (!newSystem.trim()) return;
    set('systemsUsed', [...(form.systemsUsed ?? []), newSystem.trim()]);
    setNewSystem('');
  };

  const addDoc = () => {
    if (!newDoc.trim()) return;
    set('documentsUsed', [...(form.documentsUsed ?? []), newDoc.trim()]);
    setNewDoc('');
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    const rules = form.businessRules ?? [];
    const brNum = rules.length + 1;
    const brId = `${node.data.stepId}.BR${brNum}`;
    set('businessRules', [...rules, { id: brId, text: newRule.trim() }]);
    setNewRule('');
  };

  const removeRule = (idx: number) => {
    const rules = (form.businessRules ?? []).filter((_, i) => i !== idx);
    // Re-number IDs after removal so they stay sequential
    const reNumbered: BusinessRule[] = rules.map((r, i) => ({
      ...r,
      id: `${node.data.stepId}.BR${i + 1}`,
    }));
    set('businessRules', reNumbered);
  };

  const updateRuleText = (idx: number, text: string) => {
    const rules = [...(form.businessRules ?? [])];
    rules[idx] = { ...rules[idx], text };
    set('businessRules', rules);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div>
          <p className="text-xs text-gray-400">{node.data.stepId} · {node.data.nodeType}</p>
          <p className="font-semibold text-gray-800 text-sm">{node.data.pithyLabel || 'Untitled node'}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="p-4 space-y-4 text-sm">
        {canEdit && (
          <>
            <Field label="Label">
              <input value={form.pithyLabel ?? ''} onChange={e => set('pithyLabel', e.target.value)}
                className={inputCls} placeholder="Short label" />
            </Field>

            <Field label="Actor">
              <input value={form.actor ?? ''} onChange={e => set('actor', e.target.value)}
                className={inputCls} placeholder="Who performs this step?" />
            </Field>

            <Field label="Process Status">
              <input value={form.processStatus ?? ''} onChange={e => set('processStatus', e.target.value)}
                className={inputCls} placeholder="e.g. In Progress" />
            </Field>

            <Field label="Process Sub-status">
              <input value={form.processSubstatus ?? ''} onChange={e => set('processSubstatus', e.target.value)}
                className={inputCls} placeholder="e.g. Pending Approval" />
            </Field>

            <Field label="Action Description">
              <textarea value={form.actionDescription ?? ''} onChange={e => set('actionDescription', e.target.value)}
                className={`${inputCls} h-20 resize-none`} placeholder="What happens in this step?" />
            </Field>

            <Field label="Business Rules">
              <div className="space-y-1 mb-1">
                {(form.businessRules ?? []).map((br, i) => (
                  <div key={br.id} className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                    <span className="text-xs font-mono text-amber-600 shrink-0 mt-0.5 min-w-[48px]">{br.id}</span>
                    <input
                      value={br.text}
                      onChange={e => updateRuleText(i, e.target.value)}
                      className="text-xs text-gray-700 flex-1 bg-transparent border-none outline-none focus:ring-0 p-0"
                    />
                    <button onClick={() => removeRule(i)} className="text-gray-400 hover:text-red-500 shrink-0 text-sm leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={newRule} onChange={e => setNewRule(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
                  className={`${inputCls} flex-1`} placeholder="Add business rule..." />
                <button onClick={addRule} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Add</button>
              </div>
            </Field>

            <Field label="Timing Constraints">
              <input value={form.timingConstraints ?? ''} onChange={e => set('timingConstraints', e.target.value)}
                className={inputCls} placeholder="e.g. Within 24 hours" />
            </Field>

            <Field label="Next Actor">
              <div className={`${inputCls} bg-gray-50 text-gray-500 cursor-default`}>
                {derivedNextActor || <span className="italic text-gray-400">Determined by connected node's actor</span>}
              </div>
            </Field>

            <Field label="Systems Used">
              <div className="flex flex-wrap gap-1 mb-1">
                {(form.systemsUsed ?? []).map((s, i) => (
                  <span key={i} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    {s}
                    <button onClick={() => set('systemsUsed', (form.systemsUsed ?? []).filter((_, j) => j !== i))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={newSystem} onChange={e => setNewSystem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSystem())}
                  className={`${inputCls} flex-1`} placeholder="Add system..." />
                <button onClick={addSystem} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Add</button>
              </div>
            </Field>

            <Field label="Documents Used">
              <div className="flex flex-wrap gap-1 mb-1">
                {(form.documentsUsed ?? []).map((d, i) => (
                  <span key={i} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    {d}
                    <button onClick={() => set('documentsUsed', (form.documentsUsed ?? []).filter((_, j) => j !== i))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={newDoc} onChange={e => setNewDoc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDoc())}
                  className={`${inputCls} flex-1`} placeholder="Add document..." />
                <button onClick={addDoc} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Add</button>
              </div>
            </Field>

            <Field label="Data Fields">
              {(form.dataFields ?? []).map((f, i) => (
                <div key={f.key} className="border border-gray-100 rounded-lg p-2 mb-2 space-y-1.5">
                  <div className="flex gap-1">
                    <input value={f.label} onChange={e => updateDataField(i, { label: e.target.value })}
                      className={`${inputCls} flex-1`} placeholder="Label" />
                    <select value={f.type} onChange={e => updateDataField(i, { type: e.target.value as DataField['type'] })}
                      className={inputCls}>
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <div className="flex gap-1">
                    <input value={f.key} onChange={e => updateDataField(i, { key: e.target.value })}
                      className={`${inputCls} flex-1`} placeholder="Key" />
                    <button onClick={() => removeDataField(i)} className="text-red-400 hover:text-red-600 px-1">×</button>
                  </div>
                </div>
              ))}
              <button onClick={addDataField} className="text-xs text-indigo-600 hover:underline">+ Add data field</button>
            </Field>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        )}

        {!canEdit && (
          <div className="space-y-3 text-gray-700">
            {[
              ['Label',            node.data.pithyLabel],
              ['Actor',            node.data.actor],
              ['Process Status',   node.data.processStatus],
              ['Process Sub-status', node.data.processSubstatus],
              ['Action',           node.data.actionDescription],
              ['Timing',           node.data.timingConstraints],
              ['Next Actor',       node.data.nextActor || derivedNextActor],
              ['Systems',          node.data.systemsUsed?.join(', ')],
              ['Documents',        node.data.documentsUsed?.join(', ')],
            ].map(([label, value]) => value ? (
              <div key={label as string}>
                <p className="text-xs font-medium text-gray-400">{label}</p>
                <p className="text-sm">{value}</p>
              </div>
            ) : null)}

            {node.data.businessRules?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Business Rules</p>
                <div className="space-y-1">
                  {node.data.businessRules.map(br => (
                    <div key={br.id} className="flex gap-1.5 bg-amber-50 rounded px-2 py-1 text-xs">
                      <span className="font-mono text-amber-600 shrink-0">{br.id}</span>
                      <span className="text-gray-700">{br.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {node.data.dataFields?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Data Fields</p>
                <div className="space-y-1">
                  {node.data.dataFields.map(f => (
                    <div key={f.key} className="bg-gray-50 rounded px-2 py-1 text-xs">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-gray-400 ml-1">({f.type})</span>
                      {f.value && <span className="text-gray-600 ml-1">= {f.value}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {canReview && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Review This Step</p>

            {node.data.reviewDecision && (
              <div className={`text-xs mb-2 px-2 py-1 rounded ${
                node.data.reviewDecision === 'approved' ? 'bg-green-50 text-green-700' :
                node.data.reviewDecision === 'rejected' ? 'bg-red-50 text-red-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                Current: {node.data.reviewDecision}
                {node.data.reviewComment && <span> — {node.data.reviewComment}</span>}
              </div>
            )}

            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              className={`${inputCls} h-16 resize-none mb-2`}
              placeholder="Optional comment..."
            />
            <div className="flex gap-2">
              <button onClick={() => handleReview('approved')}
                className="flex-1 bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-green-700">
                Approve
              </button>
              <button onClick={() => handleReview('comment')}
                className="flex-1 bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-600">
                Comment
              </button>
              <button onClick={() => handleReview('rejected')}
                className="flex-1 bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-700">
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
