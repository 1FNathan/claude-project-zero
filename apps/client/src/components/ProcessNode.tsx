import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import type { NodeData } from '@process-flow/shared';
import { useFlowStore } from '../store/flow';

// Diamond: 150×150 default container, inner square = 150/√2 ≈ 106 rotated 45°
const DIAMOND = 150;

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

/** Border color driven by review decision when set, otherwise the node's own color (default grey). */
function effectiveBorder(data: NodeData): string {
  if (data.reviewDecision === 'approved') return '#10b981';
  if (data.reviewDecision === 'rejected') return '#ef4444';
  if (data.reviewDecision === 'comment')  return '#f59e0b';
  return data.color || '#9ca3af';
}

export default memo(function ProcessNode({ id, data, selected, style }: NodeProps<NodeData>) {
  const { nodeType, pithyLabel, stepId, actor } = data;
  const border = effectiveBorder(data);
  const selCls = selected ? 'ring-2 ring-indigo-400 ring-offset-1' : '';

  const { flow, updateNodeDimensions } = useFlowStore();

  const handleResizeEnd = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      if (flow?.id) updateNodeDimensions(flow.id, id, params.width, params.height);
    },
    [flow?.id, id, updateNodeDimensions]
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
    const w = typeof style?.width === 'number' ? style.width : DIAMOND;
    const h = typeof style?.height === 'number' ? style.height : DIAMOND;
    const innerW = Math.round(w / Math.SQRT2);
    const innerH = Math.round(h / Math.SQRT2);
    return (
      <div className={`relative select-none ${selCls}`} style={{ width: w, height: h }}>
        <NodeResizer minWidth={100} minHeight={100} isVisible={selected} onResizeEnd={handleResizeEnd} />
        <div
          style={{
            position: 'absolute',
            width: innerW,
            height: innerH,
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
        className={`min-w-[110px] border-2 bg-white shadow-md select-none ${selCls}`}
        style={{
          borderColor: border,
          borderRadius: 9999,
          ...(style?.width ? { width: style.width } : {}),
          ...(style?.height ? { height: style.height } : {}),
        }}
      >
        <NodeResizer minWidth={110} minHeight={40} isVisible={selected} onResizeEnd={handleResizeEnd} />
        <Handles />
        <div className="px-4 py-2 text-center">
          {nameEl}
        </div>
      </div>
    );
  }

  // ── D-shape (delay) ─────────────────────────────────────────────────────────
  if (nodeType === 'delay') {
    return (
      <div
        className={`min-w-[140px] border-2 bg-white shadow-md select-none ${selCls}`}
        style={{
          borderColor: border,
          borderRadius: '4px 9999px 9999px 4px',
          ...(style?.width ? { width: style.width } : {}),
          ...(style?.height ? { height: style.height } : {}),
        }}
      >
        <NodeResizer minWidth={120} minHeight={40} isVisible={selected} onResizeEnd={handleResizeEnd} />
        <Handles />
        <div className="px-3 py-2">
          {nameEl}
          {actorEl}
        </div>
      </div>
    );
  }

  // ── Rectangle (process) ─────────────────────────────────────────────────────
  return (
    <div
      className={`min-w-[140px] border-2 bg-white rounded-lg shadow-md select-none ${selCls}`}
      style={{
        borderColor: border,
        ...(style?.width ? { width: style.width } : {}),
        ...(style?.height ? { height: style.height } : {}),
      }}
    >
      <NodeResizer minWidth={120} minHeight={50} isVisible={selected} onResizeEnd={handleResizeEnd} />
      <Handles />
      <div className="px-3 pt-2.5 pb-2">
        {nameEl}
        {actorEl}
      </div>
    </div>
  );
});
