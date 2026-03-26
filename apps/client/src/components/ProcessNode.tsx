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

export default memo(function ProcessNode({ data, selected }: NodeProps<NodeData>) {
  const isStart = data.nodeType === 'start';
  const isEnd = data.nodeType === 'end';
  const isDecision = data.nodeType === 'decision';

  const reviewColor =
    data.reviewDecision === 'approved' ? 'text-green-600' :
    data.reviewDecision === 'rejected' ? 'text-red-600' :
    data.reviewDecision === 'comment' ? 'text-amber-600' : '';

  return (
    <div
      className={`min-w-[160px] max-w-[220px] rounded-lg border-2 bg-white shadow-md select-none transition-shadow ${
        selected ? 'shadow-lg ring-2 ring-indigo-400 ring-offset-1' : ''
      }`}
      style={{ borderColor: data.color }}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-300 !border-gray-400"
        />
      )}

      <div className="px-3 pt-2.5 pb-2">
        <div
          className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded text-white mb-1.5"
          style={{ backgroundColor: data.color }}
        >
          {typeLabel[data.nodeType]}
        </div>

        <div className="text-sm font-semibold text-gray-800 leading-tight">
          {data.pithyLabel || <span className="text-gray-400 italic">{data.stepId}</span>}
        </div>

        {data.actor && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">{data.actor}</div>
        )}

        {data.reviewDecision && (
          <div className={`text-xs font-medium mt-1.5 ${reviewColor}`}>
            ● {data.reviewDecision}
          </div>
        )}
      </div>

      {!isEnd && (
        <>
          {isDecision && (
            <>
              <Handle
                type="source"
                position={Position.Right}
                id="yes"
                className="!w-3 !h-3 !bg-green-400 !border-green-500"
                style={{ top: '60%' }}
              />
              <Handle
                type="source"
                position={Position.Left}
                id="no"
                className="!w-3 !h-3 !bg-red-400 !border-red-500"
                style={{ top: '60%' }}
              />
            </>
          )}
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-gray-300 !border-gray-400"
          />
        </>
      )}
    </div>
  );
});
