import { useEffect, useState } from 'react';
import type { FlowEvent } from '@process-flow/shared';
import { flowsApi } from '../api/flows';

const eventLabel: Record<FlowEvent['eventType'], string> = {
  created:   'Created',
  submitted: 'Submitted for Review',
  approved:  'Approved',
  rejected:  'Rejected',
  revised:   'Resubmitted (Revision)',
};

const eventColor: Record<FlowEvent['eventType'], string> = {
  created:   'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  revised:   'bg-blue-100 text-blue-700',
};

const eventDot: Record<FlowEvent['eventType'], string> = {
  created:   'bg-gray-400',
  submitted: 'bg-amber-400',
  approved:  'bg-green-500',
  rejected:  'bg-red-500',
  revised:   'bg-blue-500',
};

function formatTs(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  flowId: string;
  onClose: () => void;
}

export default function FlowHistory({ flowId, onClose }: Props) {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    flowsApi.history(flowId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [flowId]);

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm">History</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && events.length === 0 && (
          <p className="text-sm text-gray-400">No history recorded.</p>
        )}
        {!loading && events.length > 0 && (
          <ol className="relative border-l border-gray-200 ml-2">
            {events.map(ev => (
              <li key={ev.id} className="mb-6 ml-4">
                <span
                  className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${eventDot[ev.eventType]}`}
                />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${eventColor[ev.eventType]}`}>
                  {eventLabel[ev.eventType]}
                </span>
                <p className="text-xs text-gray-500 mt-1">{ev.actorUsername}</p>
                <p className="text-xs text-gray-400">{formatTs(ev.createdAt)}</p>
                {ev.notes && (
                  <p className="text-xs text-gray-600 mt-1 italic">"{ev.notes}"</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
