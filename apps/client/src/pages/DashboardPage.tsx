import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { flowsApi } from '../api/flows';
import type { Flow } from '@process-flow/shared';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    flowsApi.list().then(setFlows).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const flow = await flowsApi.create({ title: newTitle.trim() });
      navigate(`/flows/${flow.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Process Flow</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {user?.username}
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              {user?.role === 'ba' ? 'Business Analyst' : 'Reviewer'}
            </span>
          </span>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {user?.role === 'reviewer' ? 'All Flows' : 'My Flows'}
          </h2>
          {user?.role === 'ba' && (
            <button
              onClick={() => setShowCreate(true)}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + New Flow
            </button>
          )}
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Flow title..."
              autoFocus
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewTitle(''); }}
              className="text-gray-500 px-3 py-2 text-sm hover:text-gray-800"
            >
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : flows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No flows yet</p>
            {user?.role === 'ba' && (
              <p className="text-sm mt-1">Create your first flow to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {flows.map(flow => (
              <div
                key={flow.id}
                onClick={() => navigate(`/flows/${flow.id}`)}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-medium text-gray-900">{flow.title}</p>
                  {flow.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate max-w-lg">{flow.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(flow.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[flow.status]}`}>
                  {statusLabel[flow.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
