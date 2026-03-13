import { useState, useRef } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useUploadAgentIcon, useRefreshAgentIcon } from '../hooks/use-agents';

interface AgentAvatarProps {
  agentId: string;
  name: string;
  size?: number;
  editable?: boolean;
}

export function AgentAvatar({ agentId, name, size = 32, editable = false }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAgentIcon();
  const refreshMutation = useRefreshAgentIcon();

  const iconUrl = `${api.getAgentIconUrl(agentId)}?t=${cacheBust}`;
  const letter = (name || '?')[0].toUpperCase();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({ agentId, file });
      setImgError(false);
      setCacheBust(Date.now());
    } catch { /* toast shown by hook */ }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync(agentId);
      setImgError(false);
      setCacheBust(Date.now());
    } catch { /* toast shown by hook */ }
  };

  const sizeClass = size <= 32 ? 'text-sm font-medium' : size <= 40 ? 'text-sm font-semibold' : 'text-lg font-semibold';

  return (
    <div className="relative group shrink-0" style={{ width: size, height: size }}>
      {imgError ? (
        <div
          className={`w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center ${sizeClass}`}
        >
          {letter}
        </div>
      ) : (
        <img
          src={iconUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
      {editable && (
        <>
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm"
              title="Upload avatar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm"
              title="Random avatar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileSelect}
          />
        </>
      )}
    </div>
  );
}
