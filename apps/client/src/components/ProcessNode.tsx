import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import type { NodeData } from '@process-flow/shared';
import { useFlowStore } from '../store/flow';

const DIAMOND_MIN = 120;

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

function effectiveBorder(data: NodeData): string {
  if (data.reviewDecision === 'approved') return '#10b981';
  if (data.reviewDecision === 'rejected') return '#ef4444';
  if (data.reviewDecision === 'comment')  return '#f59e0b';
  return data.color || '#9ca3af';
}

const StepId = () => null; // rendered inline below with absolute positioning

export default memo(function ProcessNode({ id, data, selected }: NodeProps<NodeData>) {
  const { nodeType, pithyLabel, stepId, actor } = data;
  const border = effectiveBorder(data);
  const selCls = selected ? 'ring-2 ring-indigo-400 ring-offset-1' : '';

  const { flow, updateNodeDimensions } = useFlowStore();

  const handleResizeEnd = useCallback(
    (_: unknown, params: { x: number; y: number; width: number; height: number }) => {
      if (flow?.id) updateNodeDimensions(flow.id, id, params.x, params.y, params.width, params.height);
    },
    [flow?.id, id, updateNodeDimensions]
  );

  const stepLabel = (
    <span style={{
      position: 'absolute', top: 4, left: 7,
      fontSize: 9, fontFamily: 'monospace', color: '#9ca3af', lineHeight: 1,
    }}>
      {stepId}
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

  // Shared fill-container style: makes the bordered div track the RF wrapper's
  // dimensions in both X and Y as the NodeResizer changes them.
  const fill: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    position: 'relative',
  };

  // ── Diamond (decision) ──────────────────────────────────────────────────────
  if (nodeType === 'decision') {
    return (
      <div className={selCls} style={{ ...fill, minWidth: DIAMOND_MIN, minHeight: DIAMOND_MIN }}>
        <NodeResizer minWidth={DIAMOND_MIN} minHeight={DIAMOND_MIN} isVisible={selected} onResizeEnd={handleResizeEnd} />
        {/* Inner square rotated 45° — width/height = 70.71% = 1/√2 of container */}
        <div style={{
          position: 'absolute',
          width: '70.71%',
          height: '70.71%',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          backgroundColor: 'white',
          border: `2px solid ${border}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }} />
        <div style={{ position: 'absolute', inset: 0 }}>
          {stepLabel}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', textAlign: 'center', padding: '0 28px',
          }}>
            {nameEl}
            {actorEl}
          </div>
        </div>
        <Handles decision />
      </div>
    );
  }

  // ── Pill (start / end) ──────────────────────────────────────────────────────
  if (nodeType === 'start' || nodeType === 'end') {
    return (
      <div
        className={`border-2 bg-white shadow-md select-none ${selCls}`}
        style={{ ...fill, minWidth: 110, minHeight: 40, borderColor: border, borderRadius: 9999 }}
      >
        <NodeResizer minWidth={110} minHeight={40} isVisible={selected} onResizeEnd={handleResizeEnd} />
        <Handles />
        {stepLabel}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '4px 16px 8px' }}>
          <div className="text-center">{nameEl}</div>
        </div>
      </div>
    );
  }

  // ── D-shape (delay) ─────────────────────────────────────────────────────────
  if (nodeType === 'delay') {
    return (
      <div
        className={`border-2 bg-white shadow-md select-none ${selCls}`}
        style={{ ...fill, minWidth: 140, minHeight: 40, borderColor: border, borderRadius: '4px 9999px 9999px 4px' }}
      >
        <NodeResizer minWidth={120} minHeight={40} isVisible={selected} onResizeEnd={handleResizeEnd} />
        <Handles />
        {stepLabel}
        <div className="px-3 pt-4 pb-2">
          {nameEl}
          {actorEl}
        </div>
      </div>
    );
  }

  // ── Rectangle (process) ─────────────────────────────────────────────────────
  return (
    <div
      className={`border-2 bg-white rounded-lg shadow-md select-none ${selCls}`}
      style={{ ...fill, minWidth: 140, minHeight: 50, borderColor: border }}
    >
      <NodeResizer minWidth={120} minHeight={50} isVisible={selected} onResizeEnd={handleResizeEnd} />
      <Handles />
      {stepLabel}
      <div className="px-3 pt-4 pb-2">
        {nameEl}
        {actorEl}
      </div>
    </div>
  );
});
