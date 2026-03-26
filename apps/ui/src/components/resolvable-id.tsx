import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface ResolvableIdProps {
  type: string;
  id: string;
  label: string;
  service: string;
  accountId: string;
  /** "description" (default): shows "Label truncated-id". "raw": shows raw id only. */
  display?: 'description' | 'raw';
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ResolvableId({ type, id, label, service, accountId, display = 'description' }: ResolvableIdProps) {
  const [resolved, setResolved] = useState<{ title: string; url?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position the popup below the trigger
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (resolved || loading) return;

    setLoading(true);
    setError(false);
    try {
      const data = await api.resolveId(service, accountId, type, id);
      if (data.result) {
        setResolved(data.result);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [open, resolved, loading, service, accountId, type, id]);

  const buttonText = display === 'raw' ? id : `${label} ${truncateId(id)}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        className="inline cursor-pointer underline decoration-dotted underline-offset-2 text-inherit hover:opacity-70"
        title={`${label}: ${id}`}
      >
        {buttonText}
      </button>
      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-50 w-max max-w-[900px] bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-3 text-sm font-sans whitespace-normal break-normal"
          style={{ top: pos.top, left: pos.left }}
        >
          {loading && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Resolving…
            </span>
          )}
          {error && (
            <span className="text-muted-foreground">Could not resolve</span>
          )}
          {resolved && (
            <div className="space-y-1">
              <div className="font-medium">{label}: {resolved.title}</div>
              {resolved.url && (
                <a
                  href={resolved.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open in {capitalize(service)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
