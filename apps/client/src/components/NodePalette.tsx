import type { NodeType } from '@process-flow/shared';

const nodeTypes: Array<{ type: NodeType; label: string; color: string; description: string }> = [
  { type: 'start', label: 'Start', color: '#10b981', description: 'Flow entry point' },
  { type: 'process', label: 'Process', color: '#6366f1', description: 'Task or action' },
  { type: 'decision', label: 'Decision', color: '#f59e0b', description: 'Yes/No branch' },
  { type: 'delay', label: 'Delay', color: '#8b5cf6', description: 'Wait or pause' },
  { type: 'end', label: 'End', color: '#ef4444', description: 'Flow exit point' },
];

export default function NodePalette() {
  const onDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/nodeType', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-44 bg-white border-r border-gray-200 p-3 flex flex-col gap-2 shrink-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Node Types</p>
      {nodeTypes.map(({ type, label, color, description }) => (
        <div
          key={type}
          draggable
          onDragStart={e => onDragStart(e, type)}
          className="border-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing bg-white hover:shadow-sm transition-shadow select-none"
          style={{ borderColor: color }}
        >
          <div
            className="text-xs font-semibold text-white inline-block px-1.5 py-0.5 rounded mb-0.5"
            style={{ backgroundColor: color }}
          >
            {label}
          </div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      ))}
      <p className="text-xs text-gray-400 mt-2">Drag onto canvas to add</p>
    </div>
  );
}
