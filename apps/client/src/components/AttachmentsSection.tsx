import { useState, useEffect, useRef } from 'react';
import type { Attachment } from '@process-flow/shared';
import { flowsApi } from '../api/flows';

interface Props {
  flowId: string;
  nodeId?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function AttachmentsSection({ flowId, nodeId }: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    flowsApi.listAttachments(flowId, nodeId).then(setItems).catch(() => {});
  }, [flowId, nodeId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await flowsApi.uploadAttachment(flowId, file, nodeId);
      setItems(prev => [...prev, attachment]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async (a: Attachment) => {
    const response = await flowsApi.downloadAttachment(flowId, a.id);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = a.originalName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    await flowsApi.deleteAttachment(flowId, id);
    setItems(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-500">Attachments</label>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No attachments</p>
      ) : (
        <div className="space-y-1">
          {items.map(a => (
            <div key={a.id} className="flex items-center gap-1.5 text-xs bg-gray-50 rounded px-2 py-1.5">
              <button
                onClick={() => handleDownload(a)}
                className="flex-1 truncate text-left text-indigo-600 hover:underline"
                title={a.originalName}
              >
                {a.originalName}
              </button>
              <span className="text-gray-400 shrink-0">{formatSize(a.size)}</span>
              <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 shrink-0 leading-none">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
