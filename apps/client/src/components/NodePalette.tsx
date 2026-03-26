import type { NodeType } from '@process-flow/shared';

const DIAMOND = 80;
const DIAMOND_INNER = Math.round(DIAMOND / Math.SQRT2);

interface PaletteEntry {
  type: NodeType;
  label: string;
  color: string;
  description: string;
}

const entries: PaletteEntry[] = [
  { type: 'start',    label: 'Start',    color: '#10b981', description: 'Entry point'  },
  { type: 'process',  label: 'Process',  color: '#6366f1', description: 'Task / action' },
  { type: 'decision', label: 'Decision', color: '#f59e0b', description: 'Yes / No branch' },
  { type: 'delay',    label: 'Delay',    color: '#8b5cf6', description: 'Wait / pause'  },
  { type: 'end',      label: 'End',      color: '#ef4444', description: 'Exit point'    },
];

function onDragStart(e: React.DragEvent, type: NodeType) {
  e.dataTransfer.setData('application/nodeType', type);
  e.dataTransfer.effectAllowed = 'move';
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-block text-xs font-semibold text-white px-1.5 py-0.5 rounded leading-tight"
      style={{ backgroundColor: color }}>
      {label}
    </span>
  );
}

function Desc({ text }: { text: string }) {
  return <span className="text-xs text-gray-400 leading-tight">{text}</span>;
}

export default function NodePalette() {
  return (
    <div className="w-44 bg-white border-r border-gray-200 p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Node Types</p>

      {entries.map(({ type, label, color, description }) => {
        const dragProps = {
          draggable: true,
          onDragStart: (e: React.DragEvent) => onDragStart(e, type),
        };

        /* ── Diamond ─────────────────────────────────────── */
        if (type === 'decision') {
          return (
            <div key={type} className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none" {...dragProps}>
              <div className="relative" style={{ width: DIAMOND, height: DIAMOND }}>
                <div style={{
                  position: 'absolute',
                  width: DIAMOND_INNER,
                  height: DIAMOND_INNER,
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  backgroundColor: 'white',
                  border: `2px solid ${color}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', padding: '0 12px',
                  gap: 2,
                }}>
                  <Badge color={color} label={label} />
                  <Desc text={description} />
                </div>
              </div>
            </div>
          );
        }

        /* ── Pill (start / end) ──────────────────────────── */
        if (type === 'start' || type === 'end') {
          return (
            <div key={type}
              className="border-2 bg-white shadow-sm cursor-grab active:cursor-grabbing select-none px-3 py-2 text-center hover:shadow-md transition-shadow"
              style={{ borderColor: color, borderRadius: 9999 }}
              {...dragProps}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Badge color={color} label={label} />
                <Desc text={description} />
              </div>
            </div>
          );
        }

        /* ── D-shape (delay) ─────────────────────────────── */
        if (type === 'delay') {
          return (
            <div key={type}
              className="border-2 bg-white shadow-sm cursor-grab active:cursor-grabbing select-none px-3 py-2 hover:shadow-md transition-shadow"
              style={{ borderColor: color, borderRadius: '4px 9999px 9999px 4px' }}
              {...dragProps}
            >
              <div className="flex flex-col gap-0.5">
                <Badge color={color} label={label} />
                <Desc text={description} />
              </div>
            </div>
          );
        }

        /* ── Rectangle (process) ─────────────────────────── */
        return (
          <div key={type}
            className="border-2 rounded-lg bg-white shadow-sm cursor-grab active:cursor-grabbing select-none px-3 py-2 hover:shadow-md transition-shadow"
            style={{ borderColor: color }}
            {...dragProps}
          >
            <div className="flex flex-col gap-0.5">
              <Badge color={color} label={label} />
              <Desc text={description} />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 mt-1">Drag onto canvas</p>
    </div>
  );
}
