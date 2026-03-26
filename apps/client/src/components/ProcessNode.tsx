import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { NodeData } from '@process-flow/shared';

const typeLabel: Record<string, string> = {
  process: 'Process',
  decision: 'Decision',
  delay: 'Delay',
  start: 'Start',
  end: 'End',
};

// Diamond: 150×150 container, inner square = 150/√2 ≈ 106 rotated 45°
const DIAMOND = 150;
const DIAMOND_INNER = Math.round(DIAMOND / Math.SQRT2);

const hCls = '!w-3 !h-3 !bg-gray-300 !border-gray-400 !border-2';
const hYes = '!w-3 !h-3 !bg-green-200 !border-green-500 !border-2';
const hNo  = '!w-3 !h-3 !bg-red-200  !border-red-400  !border-2';

function Handles({ decision = false }: { decision?: boolean }) {
  return (
    <>
      <Handle type="source" position={Position.Top}    id="top"    className={hCls} />
      <Handle type="source" position={Position.Right}  id="right"  className={decision ? hYes : hCls} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={hCls} />
      <Handle type="source" position={Position.Left}   id="left"   className={decision ? hNo  : hCls} />
    </>
  );
}

/** Border color driven by review decision when set, otherwise the node's own color. */
function effectiveBorder(data: NodeData): string {
  if (data.reviewDecision === 'approved') return '#10b981';
  if (data.reviewDecision === 'rejected') return '#ef4444';
  if (data.reviewDecision === 'comment')  return '#f59e0b';
  return data.color;
}

export default memo(function ProcessNode({ data, selected }: NodeProps<NodeData>) {
  const { nodeType, color, pithyLabel, stepId, actor } = data;
  const border = effectiveBorder(data);
  const selCls = selected ? 'ring-2 ring-indigo-400 ring-offset-1' : '';

  const typeTag = (
    <span
      className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded text-white mb-1"
      style={{ backgroundColor: color }}
    >
      {typeLabel[nodeType]}
    </span>
  );

  const nameEl = (
    <div className="text-sm font-semibold text-gray-800 leading-tight">
      {pithyLabel || <span className="text-gray-400 italic text-xs">{stepId}</span>}
    </div>
  );

  const actorEl = actor
    ? <div className="text-xs text-gray-500 mt-0.5 truncate">{actor}</div>
    : null;

  // ── Diamond (decision) ──────────────────────────────────────────────────────
  if (nodeType === 'decision') {
    return (
      <div className={`relative select-none ${selCls}`} style={{ width: DIAMOND, height: DIAMOND }}>
        <div
          style={{
            position: 'absolute',
            width: DIAMOND_INNER,
            height: DIAMOND_INNER,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            backgroundColor: 'white',
            border: `2px solid ${border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 28px',
          }}
        >
          {typeTag}
          {nameEl}
          {actorEl}
        </div>
        <Handles decision />
      </div>
    );
  }

  // ── Pill (start / end) ──────────────────────────────────────────────────────
  if (nodeType === 'start' || nodeType === 'end') {
    return (
      <div
        className={`min-w-[110px] max-w-[170px] border-2 bg-white shadow-md select-none ${selCls}`}
        style={{ borderColor: border, borderRadius: 9999 }}
      >
        <Handles />
        <div className="px-4 py-2 text-center">
          {typeTag}
          {nameEl}
        </div>
      </div>
    );
  }

  // ── D-shape (delay) ─────────────────────────────────────────────────────────
  if (nodeType === 'delay') {
    return (
      <div
        className={`min-w-[140px] max-w-[200px] border-2 bg-white shadow-md select-none ${selCls}`}
        style={{ borderColor: border, borderRadius: '4px 9999px 9999px 4px' }}
      >
        <Handles />
        <div className="px-3 py-2">
          {typeTag}
          {nameEl}
          {actorEl}
        </div>
      </div>
    );
  }

  // ── Rectangle (process) ─────────────────────────────────────────────────────
  return (
    <div
      className={`min-w-[140px] max-w-[200px] border-2 bg-white rounded-lg shadow-md select-none ${selCls}`}
      style={{ borderColor: border }}
    >
      <Handles />
      <div className="px-3 pt-2.5 pb-2">
        {typeTag}
        {nameEl}
        {actorEl}
      </div>
    </div>
  );
});
